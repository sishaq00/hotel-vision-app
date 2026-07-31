-- 0. extension for exclusion constraint on uuid + daterange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. normalize legacy statuses then lock them down
UPDATE public.reservations SET status = 'cancelled'
  WHERE status NOT IN ('confirmed','checked-in','checked-out','cancelled');

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed','checked-in','checked-out','cancelled'));

-- 2. double-booking protection at the database level
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_double_booking;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_no_double_booking
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (room_id IS NOT NULL AND status IN ('confirmed','checked-in'));

-- 3. row-level validation
CREATE OR REPLACE FUNCTION public.validate_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived boolean;
BEGIN
  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'check_out (%) must be after check_in (%)', NEW.check_out, NEW.check_in
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT COALESCE(archived, false) INTO v_archived FROM public.rooms WHERE id = NEW.room_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'room % does not exist', NEW.room_id USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF v_archived AND NEW.status IN ('confirmed','checked-in') THEN
      RAISE EXCEPTION 'room % is archived and cannot be booked', NEW.room_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_reservation_trg ON public.reservations;
CREATE TRIGGER validate_reservation_trg
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.validate_reservation();

-- 4. explicit reservation audit helper (complements the global audit trigger)
CREATE OR REPLACE FUNCTION public.log_reservation_action(
  p_action text, p_id uuid, p_old jsonb, p_new jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_log (user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), p_action, 'reservation', p_id,
          jsonb_build_object('old', p_old, 'new', p_new, 'at', now()));
$$;

-- 5. RPC layer -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_guest_id uuid,
  p_room_id uuid,
  p_check_in date,
  p_check_out date,
  p_total_amount numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_group_master_id uuid DEFAULT NULL,
  p_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.reservations
    (id, guest_id, room_id, check_in, check_out, total_amount, notes, source, group_master_id, status)
  VALUES
    (COALESCE(p_id, gen_random_uuid()), p_guest_id, p_room_id, p_check_in, p_check_out,
     COALESCE(p_total_amount, 0), p_notes, p_source, p_group_master_id, 'confirmed')
  RETURNING id INTO v_id;

  PERFORM public.log_reservation_action('reservation.create', v_id, NULL,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = v_id)));
  RETURN v_id;
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Room is already booked for these dates' USING ERRCODE = '23P01';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reservation(
  p_reservation_id uuid,
  p_room_id uuid DEFAULT NULL,
  p_check_in date DEFAULT NULL,
  p_check_out date DEFAULT NULL,
  p_total_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old jsonb; v_row public.reservations;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status IN ('checked-out','cancelled') THEN
    RAISE EXCEPTION 'cannot modify a % reservation', v_row.status USING ERRCODE = 'check_violation';
  END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations SET
    room_id      = COALESCE(p_room_id, room_id),
    check_in     = COALESCE(p_check_in, check_in),
    check_out    = COALESCE(p_check_out, check_out),
    total_amount = COALESCE(p_total_amount, total_amount),
    notes        = COALESCE(p_notes, notes)
  WHERE id = p_reservation_id;

  PERFORM public.log_reservation_action('reservation.update', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Room is already booked for these dates' USING ERRCODE = '23P01';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_reservation(p_reservation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.reservations; v_old jsonb; v_folio uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status <> 'confirmed' THEN
    RAISE EXCEPTION 'reservation is % and cannot be checked in', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations
     SET status = 'checked-in', checked_in_at = now()
   WHERE id = p_reservation_id;

  IF v_row.room_id IS NOT NULL THEN
    UPDATE public.rooms SET status = 'occupied' WHERE id = v_row.room_id;
  END IF;

  SELECT id INTO v_folio FROM public.folios
   WHERE reservation_id = p_reservation_id AND status = 'open' LIMIT 1;
  IF v_folio IS NULL THEN
    INSERT INTO public.folios (reservation_id, guest_id, status)
    VALUES (p_reservation_id, v_row.guest_id, 'open')
    RETURNING id INTO v_folio;
  END IF;

  PERFORM public.log_reservation_action('reservation.check-in', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
  RETURN v_folio;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_out_reservation(
  p_reservation_id uuid,
  p_final_amount numeric DEFAULT NULL,
  p_invoice jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.reservations; v_old jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status <> 'checked-in' THEN
    RAISE EXCEPTION 'reservation is % and cannot be checked out', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations
     SET status = 'checked-out',
         checked_out_at = now(),
         total_amount = COALESCE(p_final_amount, total_amount),
         invoice = COALESCE(p_invoice, invoice)
   WHERE id = p_reservation_id;

  UPDATE public.folios SET status = 'closed', balance = 0
   WHERE reservation_id = p_reservation_id AND status = 'open';

  IF v_row.room_id IS NOT NULL THEN
    UPDATE public.rooms
       SET status = 'available', housekeeping_status = 'dirty'
     WHERE id = v_row.room_id;
    INSERT INTO public.housekeeping_tasks (room_id, task_type, status)
    VALUES (v_row.room_id, 'checkout-clean', 'pending');
  END IF;

  PERFORM public.log_reservation_action('reservation.check-out', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text DEFAULT NULL,
  p_no_show boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.reservations; v_old jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status = 'checked-out' THEN
    RAISE EXCEPTION 'a checked-out reservation cannot be cancelled' USING ERRCODE = 'check_violation';
  END IF;
  IF v_row.status = 'cancelled' THEN RETURN; END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations
     SET status = 'cancelled',
         cancelled_at = now(),
         no_show = COALESCE(p_no_show, false),
         notes = CASE WHEN p_reason IS NULL OR p_reason = '' THEN notes
                      ELSE COALESCE(notes || E'\n', '') || 'Cancelled: ' || p_reason END
   WHERE id = p_reservation_id;

  IF v_row.room_id IS NOT NULL AND v_row.status = 'checked-in' THEN
    UPDATE public.rooms SET status = 'available' WHERE id = v_row.room_id;
  END IF;

  PERFORM public.log_reservation_action('reservation.cancel', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
END;
$$;

-- 6. execution rights: staff only, enforced inside each function
REVOKE ALL ON FUNCTION public.create_reservation(uuid,uuid,date,date,numeric,text,text,uuid,uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.update_reservation(uuid,uuid,date,date,numeric,text) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_in_reservation(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_out_reservation(uuid,numeric,jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.cancel_reservation(uuid,text,boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.log_reservation_action(text,uuid,jsonb,jsonb) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_reservation(uuid,uuid,date,date,numeric,text,text,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_reservation(uuid,uuid,date,date,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_out_reservation(uuid,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid,text,boolean) TO authenticated;
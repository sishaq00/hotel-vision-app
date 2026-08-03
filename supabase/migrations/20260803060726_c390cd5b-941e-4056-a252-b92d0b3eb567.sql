
-- 1. Confirmation numbers -----------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.confirmation_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.next_confirmation_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'RES-' || lpad(nextval('public.confirmation_number_seq')::text, 6, '0');
$$;

UPDATE public.reservations
   SET confirmation_number = public.next_confirmation_number()
 WHERE confirmation_number IS NULL OR btrim(confirmation_number) = '';

ALTER TABLE public.reservations
  ALTER COLUMN confirmation_number SET DEFAULT public.next_confirmation_number();

CREATE OR REPLACE FUNCTION public.reservations_set_confirmation_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.confirmation_number IS NULL OR btrim(NEW.confirmation_number) = '' THEN
    NEW.confirmation_number := public.next_confirmation_number();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS reservations_confirmation_number_trg ON public.reservations;
CREATE TRIGGER reservations_confirmation_number_trg
BEFORE INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.reservations_set_confirmation_number();

CREATE UNIQUE INDEX IF NOT EXISTS reservations_confirmation_number_key
  ON public.reservations (confirmation_number);

-- 2. New operational columns ---------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS guests_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rate_plan_id text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz;

-- 3. Status constraint incl. no-show -------------------------------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.reservations'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.reservations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.reservations SET status = 'no-show'
 WHERE no_show IS TRUE AND status = 'cancelled';

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed','checked-in','checked-out','cancelled','no-show'));

-- 4. Reservation history / timeline --------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservation_events_res_idx
  ON public.reservation_events (reservation_id, created_at);

GRANT SELECT, INSERT ON public.reservation_events TO authenticated;
GRANT ALL ON public.reservation_events TO service_role;
ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read reservation events" ON public.reservation_events;
CREATE POLICY "Staff can read reservation events" ON public.reservation_events
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can add reservation events" ON public.reservation_events;
CREATE POLICY "Staff can add reservation events" ON public.reservation_events
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_reservation_event(
  p_reservation_id uuid, p_event_type text, p_details jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.reservation_events (reservation_id, event_type, details, user_id, user_email)
  VALUES (p_reservation_id, p_event_type, p_details, auth.uid(),
          NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email');
END; $$;

-- 5. update_reservation (extended) ---------------------------------------------
DROP FUNCTION IF EXISTS public.update_reservation(uuid, uuid, date, date, numeric, text);

CREATE OR REPLACE FUNCTION public.update_reservation(
  p_reservation_id uuid,
  p_guest_id uuid DEFAULT NULL,
  p_room_id uuid DEFAULT NULL,
  p_check_in date DEFAULT NULL,
  p_check_out date DEFAULT NULL,
  p_guests_count integer DEFAULT NULL,
  p_total_amount numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_rate_plan_id text DEFAULT NULL,
  p_source text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb; v_row public.reservations;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status IN ('checked-out','cancelled','no-show') THEN
    RAISE EXCEPTION 'cannot modify a % reservation', v_row.status USING ERRCODE = 'check_violation';
  END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations SET
    guest_id     = COALESCE(p_guest_id, guest_id),
    room_id      = COALESCE(p_room_id, room_id),
    check_in     = COALESCE(p_check_in, check_in),
    check_out    = COALESCE(p_check_out, check_out),
    guests_count = COALESCE(p_guests_count, guests_count),
    total_amount = COALESCE(p_total_amount, total_amount),
    notes        = COALESCE(p_notes, notes),
    rate_plan_id = COALESCE(p_rate_plan_id, rate_plan_id),
    source       = COALESCE(p_source, source),
    updated_at   = now()
  WHERE id = p_reservation_id;

  PERFORM public.log_reservation_action('reservation.update', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
  PERFORM public.log_reservation_event(p_reservation_id, 'edited', jsonb_build_object(
    'before', v_old,
    'after', to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id))));
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Room is already booked for these dates' USING ERRCODE = '23P01';
END; $$;

-- 6. Room move -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.move_reservation_room(
  p_reservation_id uuid, p_new_room_id uuid, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations; v_old jsonb; v_dest public.rooms;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a reason is required for a room move' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status NOT IN ('confirmed','checked-in') THEN
    RAISE EXCEPTION 'cannot move a % reservation', v_row.status USING ERRCODE = 'check_violation';
  END IF;
  IF v_row.room_id = p_new_room_id THEN
    RAISE EXCEPTION 'the guest is already in this room' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_dest FROM public.rooms WHERE id = p_new_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'destination room not found'; END IF;
  IF COALESCE(v_dest.archived, false) THEN
    RAISE EXCEPTION 'destination room is archived' USING ERRCODE = 'check_violation';
  END IF;

  v_old := to_jsonb(v_row);

  UPDATE public.reservations
     SET room_id = p_new_room_id, updated_at = now()
   WHERE id = p_reservation_id;

  IF v_row.status = 'checked-in' THEN
    IF v_row.room_id IS NOT NULL THEN
      UPDATE public.rooms SET status = 'cleaning' WHERE id = v_row.room_id;
    END IF;
    UPDATE public.rooms SET status = 'occupied' WHERE id = p_new_room_id;

    INSERT INTO public.housekeeping_tasks (room_id, status, priority, notes)
    SELECT p_new_room_id, 'pending', 'high', 'Room move cleanup: ' || p_reason
     WHERE EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='housekeeping_tasks' AND column_name='priority');
  END IF;

  PERFORM public.log_reservation_action('reservation.room_move', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
  PERFORM public.log_reservation_event(p_reservation_id, 'room_moved', jsonb_build_object(
    'from_room_id', v_row.room_id, 'to_room_id', p_new_room_id, 'reason', p_reason));
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Room is already booked for these dates' USING ERRCODE = '23P01';
END; $$;

-- 7. Cancellation (reason required + fee) -----------------------------------------
DROP FUNCTION IF EXISTS public.cancel_reservation(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid, p_reason text, p_fee numeric DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations; v_old jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a cancellation reason is required' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status IN ('checked-out','cancelled','no-show') THEN
    RAISE EXCEPTION 'cannot cancel a % reservation', v_row.status USING ERRCODE = 'check_violation';
  END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations
     SET status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
         cancellation_reason = p_reason, cancellation_fee = COALESCE(p_fee, 0),
         no_show = false, updated_at = now()
   WHERE id = p_reservation_id;

  IF v_row.room_id IS NOT NULL AND v_row.status = 'checked-in' THEN
    UPDATE public.rooms SET status = 'available' WHERE id = v_row.room_id;
  END IF;

  PERFORM public.log_reservation_action('reservation.cancel', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
  PERFORM public.log_reservation_event(p_reservation_id, 'cancelled',
    jsonb_build_object('reason', p_reason, 'fee', COALESCE(p_fee, 0)));
END; $$;

-- 8. No show ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_reservation_no_show(
  p_reservation_id uuid, p_reason text DEFAULT NULL, p_fee numeric DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations; v_old jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation % not found', p_reservation_id; END IF;
  IF v_row.status <> 'confirmed' THEN
    RAISE EXCEPTION 'only a confirmed reservation can be marked as no show' USING ERRCODE = 'check_violation';
  END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.reservations
     SET status = 'no-show', no_show = true, no_show_at = now(),
         cancelled_by = auth.uid(), cancellation_reason = p_reason,
         cancellation_fee = COALESCE(p_fee, 0), updated_at = now()
   WHERE id = p_reservation_id;

  PERFORM public.log_reservation_action('reservation.no_show', p_reservation_id, v_old,
    to_jsonb((SELECT r FROM public.reservations r WHERE r.id = p_reservation_id)));
  PERFORM public.log_reservation_event(p_reservation_id, 'no_show',
    jsonb_build_object('reason', p_reason, 'fee', COALESCE(p_fee, 0)));
END; $$;

-- 9. Timeline events for existing lifecycle RPCs --------------------------------------
CREATE OR REPLACE FUNCTION public.get_reservation_events(p_reservation_id uuid)
RETURNS SETOF public.reservation_events LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT * FROM public.reservation_events
   WHERE reservation_id = p_reservation_id
     AND public.is_staff(auth.uid())
   ORDER BY created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.update_reservation(uuid,uuid,uuid,date,date,integer,numeric,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_reservation_room(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_reservation_no_show(uuid,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reservation_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_reservation_event(uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_confirmation_number() TO authenticated;

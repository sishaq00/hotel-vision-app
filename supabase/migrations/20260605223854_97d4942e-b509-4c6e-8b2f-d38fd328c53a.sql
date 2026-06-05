
-- ============================================================
-- PHASE 1: Foreign Keys, Audit Trigger, Atomic RPCs
-- ============================================================

-- ---------- 1. FOREIGN KEYS ----------
-- Reservations
ALTER TABLE public.reservations
  ADD CONSTRAINT fk_reservations_guest_id FOREIGN KEY (guest_id)
    REFERENCES public.guests(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_reservations_room_id FOREIGN KEY (room_id)
    REFERENCES public.rooms(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_reservations_group_master_id FOREIGN KEY (group_master_id)
    REFERENCES public.group_masters(id) ON DELETE SET NULL;

-- Payments
ALTER TABLE public.payments
  ADD CONSTRAINT fk_payments_reservation_id FOREIGN KEY (reservation_id)
    REFERENCES public.reservations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_payments_guest_id FOREIGN KEY (guest_id)
    REFERENCES public.guests(id) ON DELETE SET NULL;

-- Folios
ALTER TABLE public.folios
  ADD CONSTRAINT fk_folios_reservation_id FOREIGN KEY (reservation_id)
    REFERENCES public.reservations(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_folios_guest_id FOREIGN KEY (guest_id)
    REFERENCES public.guests(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_folios_house_account_id FOREIGN KEY (house_account_id)
    REFERENCES public.house_accounts(id) ON DELETE SET NULL;

-- Folio charges
ALTER TABLE public.folio_charges
  ADD CONSTRAINT fk_folio_charges_folio_id FOREIGN KEY (folio_id)
    REFERENCES public.folios(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_folio_charges_posted_by FOREIGN KEY (posted_by)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Credit notes
ALTER TABLE public.credit_notes
  ADD CONSTRAINT fk_credit_notes_reservation_id FOREIGN KEY (reservation_id)
    REFERENCES public.reservations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_credit_notes_issued_by FOREIGN KEY (issued_by)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Advance deposits
ALTER TABLE public.advance_deposits
  ADD CONSTRAINT fk_advance_deposits_reservation_id FOREIGN KEY (reservation_id)
    REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_advance_deposits_guest_id FOREIGN KEY (guest_id)
    REFERENCES public.guests(id) ON DELETE SET NULL;

-- Housekeeping tasks
ALTER TABLE public.housekeeping_tasks
  ADD CONSTRAINT fk_housekeeping_tasks_room_id FOREIGN KEY (room_id)
    REFERENCES public.rooms(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_housekeeping_tasks_assigned_to FOREIGN KEY (assigned_to)
    REFERENCES public.housekeepers(id) ON DELETE SET NULL;

-- Housekeeper reports
ALTER TABLE public.housekeeper_reports
  ADD CONSTRAINT fk_housekeeper_reports_housekeeper_id FOREIGN KEY (housekeeper_id)
    REFERENCES public.housekeepers(id) ON DELETE SET NULL;

-- Housekeepers → auth.users
ALTER TABLE public.housekeepers
  ADD CONSTRAINT fk_housekeepers_user_id FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Maintenance tickets
ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT fk_maintenance_tickets_room_id FOREIGN KEY (room_id)
    REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_maintenance_tickets_reported_by FOREIGN KEY (reported_by)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_maintenance_tickets_assigned_to FOREIGN KEY (assigned_to)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Lost & found
ALTER TABLE public.lost_found
  ADD CONSTRAINT fk_lost_found_room_id FOREIGN KEY (room_id)
    REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_lost_found_claimed_by_guest_id FOREIGN KEY (claimed_by_guest_id)
    REFERENCES public.guests(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_lost_found_found_by FOREIGN KEY (found_by)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Product sales
ALTER TABLE public.product_sales
  ADD CONSTRAINT fk_product_sales_product_id FOREIGN KEY (product_id)
    REFERENCES public.product_items(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_product_sales_reservation_id FOREIGN KEY (reservation_id)
    REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_product_sales_guest_id FOREIGN KEY (guest_id)
    REFERENCES public.guests(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_product_sales_sold_by FOREIGN KEY (sold_by)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Rooms
ALTER TABLE public.rooms
  ADD CONSTRAINT fk_rooms_assigned_housekeeper_id FOREIGN KEY (assigned_housekeeper_id)
    REFERENCES public.housekeepers(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_rooms_assigned_by FOREIGN KEY (assigned_by)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Shifts
ALTER TABLE public.shifts
  ADD CONSTRAINT fk_shifts_user_id FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Reminders
ALTER TABLE public.reminders
  ADD CONSTRAINT fk_reminders_created_by FOREIGN KEY (created_by)
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_reminders_assigned_to FOREIGN KEY (assigned_to)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Audit log
ALTER TABLE public.audit_log
  ADD CONSTRAINT fk_audit_log_user_id FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Useful indexes on FK columns (Postgres does not auto-index FK child columns)
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id          ON public.reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id           ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id        ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_guest_id              ON public.payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_folios_reservation_id          ON public.folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folio_charges_folio_id         ON public.folio_charges(folio_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id     ON public.housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id       ON public.product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity               ON public.audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at           ON public.audit_log(created_at DESC);

-- ---------- 2. GLOBAL AUDIT TRIGGER ----------
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity_id := COALESCE(NEW.id::text, '');
    v_details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := COALESCE(NEW.id::text, '');
    v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_entity_id := COALESCE(OLD.id::text, '');
    v_details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_log (user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, v_details);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach to 13 tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'reservations','payments','folios','folio_charges','credit_notes',
    'advance_deposits','shifts','housekeeping_tasks','maintenance_tickets',
    'product_sales','lost_found','house_accounts','rooms'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()',
      t, t
    );
  END LOOP;
END $$;

-- ---------- 3. ATOMIC RPCs ----------

-- 3a. Check-in
CREATE OR REPLACE FUNCTION public.check_in_reservation(p_reservation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
  v_folio_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_res FROM public.reservations
   WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_found %', p_reservation_id;
  END IF;
  IF v_res.status <> 'confirmed' THEN
    RAISE EXCEPTION 'invalid_status: expected confirmed, got %', v_res.status;
  END IF;

  UPDATE public.reservations
     SET status = 'checked-in', checked_in_at = now(), updated_at = now()
   WHERE id = p_reservation_id;

  IF v_res.room_id IS NOT NULL THEN
    UPDATE public.rooms
       SET status = 'occupied', updated_at = now()
     WHERE id = v_res.room_id;
  END IF;

  SELECT id INTO v_folio_id FROM public.folios
   WHERE reservation_id = p_reservation_id AND status = 'open' LIMIT 1;
  IF v_folio_id IS NULL THEN
    INSERT INTO public.folios (reservation_id, guest_id, status, balance)
    VALUES (p_reservation_id, v_res.guest_id, 'open', 0)
    RETURNING id INTO v_folio_id;
  END IF;

  RETURN v_folio_id;
END;
$$;

-- 3b. Check-out
CREATE OR REPLACE FUNCTION public.check_out_reservation(
  p_reservation_id uuid,
  p_final_amount   numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_res FROM public.reservations
   WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_found %', p_reservation_id;
  END IF;
  IF v_res.status <> 'checked-in' THEN
    RAISE EXCEPTION 'invalid_status: expected checked-in, got %', v_res.status;
  END IF;

  UPDATE public.reservations
     SET status = 'checked-out',
         checked_out_at = now(),
         total_amount = COALESCE(p_final_amount, total_amount),
         updated_at = now()
   WHERE id = p_reservation_id;

  UPDATE public.folios
     SET status = 'closed', balance = 0, updated_at = now()
   WHERE reservation_id = p_reservation_id AND status = 'open';

  IF v_res.room_id IS NOT NULL THEN
    UPDATE public.rooms
       SET status = 'available',
           housekeeping_status = 'dirty',
           updated_at = now()
     WHERE id = v_res.room_id;

    INSERT INTO public.housekeeping_tasks (room_id, task_type, status)
    VALUES (v_res.room_id, 'checkout-clean', 'pending');
  END IF;
END;
$$;

-- 3c. Record payment with audit + folio link
CREATE OR REPLACE FUNCTION public.record_payment_with_audit(
  p_reservation_id uuid,
  p_guest_id       uuid,
  p_amount         numeric,
  p_method         text DEFAULT 'cash',
  p_status         text DEFAULT 'paid',
  p_notes          text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_folio_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  INSERT INTO public.payments (reservation_id, guest_id, amount, method, status, notes)
  VALUES (p_reservation_id, p_guest_id, p_amount, p_method, p_status, p_notes)
  RETURNING id INTO v_payment_id;

  IF p_reservation_id IS NOT NULL AND p_status = 'paid' THEN
    SELECT id INTO v_folio_id FROM public.folios
     WHERE reservation_id = p_reservation_id AND status = 'open' LIMIT 1;
    IF v_folio_id IS NOT NULL THEN
      INSERT INTO public.folio_charges (folio_id, description, amount, category, posted_by)
      VALUES (v_folio_id, COALESCE('Payment · '||p_method, 'Payment'),
              -p_amount, 'payment', auth.uid());
    END IF;
  END IF;

  RETURN v_payment_id;
END;
$$;

-- Grant execute to authenticated (RPCs do their own is_staff check)
GRANT EXECUTE ON FUNCTION public.check_in_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_out_reservation(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_with_audit(uuid, uuid, numeric, text, text, text) TO authenticated;

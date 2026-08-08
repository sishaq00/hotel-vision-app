ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id),
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
  ON public.payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_created_by_idx ON public.payments (created_by);
CREATE INDEX IF NOT EXISTS payments_shift_id_idx ON public.payments (shift_id);
CREATE INDEX IF NOT EXISTS payments_reservation_id_idx ON public.payments (reservation_id);

DROP FUNCTION IF EXISTS public.record_payment_with_audit(uuid, uuid, numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.record_payment_with_audit(
  p_reservation_id uuid,
  p_amount numeric,
  p_idempotency_key text,
  p_guest_id uuid DEFAULT NULL,
  p_method text DEFAULT 'cash',
  p_status text DEFAULT 'paid',
  p_notes text DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.payments;
  v_shift_id uuid;
  v_folio_id uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key_required';
  END IF;

  SELECT * INTO v_payment FROM public.payments
   WHERE idempotency_key = p_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN v_payment;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: %', p_amount;
  END IF;

  SELECT id INTO v_shift_id FROM public.shifts
   WHERE status = 'open' AND user_id = auth.uid()
   ORDER BY opened_at DESC LIMIT 1;

  IF v_shift_id IS NULL AND p_shift_id IS NOT NULL THEN
    SELECT id INTO v_shift_id FROM public.shifts
     WHERE id = p_shift_id AND status = 'open';
  END IF;

  IF v_shift_id IS NULL THEN
    SELECT id INTO v_shift_id FROM public.shifts
     WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1;
  END IF;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'no_open_shift';
  END IF;

  INSERT INTO public.payments (
    reservation_id, guest_id, amount, method, status, notes,
    created_by, shift_id, idempotency_key, meta
  ) VALUES (
    p_reservation_id, p_guest_id, p_amount, p_method, p_status, p_notes,
    auth.uid(), v_shift_id, p_idempotency_key, COALESCE(p_meta, '{}'::jsonb)
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_payment;

  IF v_payment.id IS NULL THEN
    SELECT * INTO v_payment FROM public.payments
     WHERE idempotency_key = p_idempotency_key LIMIT 1;
    RETURN v_payment;
  END IF;

  IF p_reservation_id IS NOT NULL AND p_status = 'paid' THEN
    SELECT id INTO v_folio_id FROM public.folios
     WHERE reservation_id = p_reservation_id AND status = 'open' LIMIT 1;
    IF v_folio_id IS NOT NULL THEN
      INSERT INTO public.folio_charges (folio_id, description, amount, category, posted_by)
      VALUES (v_folio_id, 'Payment · ' || COALESCE(p_method, 'cash'), -p_amount, 'payment', auth.uid());
    END IF;
  END IF;

  INSERT INTO public.audit_log (user_id, entity, entity_id, action, details)
  VALUES (auth.uid(), 'payment', v_payment.id::text, 'create',
          jsonb_build_object(
            'amount', p_amount,
            'method', p_method,
            'status', p_status,
            'reservation_id', p_reservation_id,
            'shift_id', v_shift_id,
            'idempotency_key', p_idempotency_key
          ));

  RETURN v_payment;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_payment_with_audit(uuid, numeric, text, uuid, text, text, text, uuid, jsonb) TO authenticated;
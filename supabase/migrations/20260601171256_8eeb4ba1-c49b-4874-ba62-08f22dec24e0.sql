
-- 1) Enable Realtime on key tables
ALTER TABLE public.reservations REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.guests REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.housekeeping_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;
ALTER TABLE public.folios REPLICA IDENTITY FULL;
ALTER TABLE public.folio_charges REPLICA IDENTITY FULL;
ALTER TABLE public.reminders REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'reservations','rooms','guests','payments','housekeeping_tasks',
    'maintenance_tickets','shifts','folios','folio_charges','reminders'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- 2) Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('hotel-logo', 'hotel-logo', true),
  ('room-photos', 'room-photos', true),
  ('housekeeping-photos', 'housekeeping-photos', false),
  ('payment-proofs', 'payment-proofs', false),
  ('guest-documents', 'guest-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage policies
-- Public read for logo & room photos
CREATE POLICY "Public read hotel-logo"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-logo');

CREATE POLICY "Public read room-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-photos');

-- Staff can read private buckets
CREATE POLICY "Staff read private buckets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('housekeeping-photos','payment-proofs','guest-documents')
    AND public.is_staff(auth.uid())
  );

-- Staff can upload to all hotel buckets
CREATE POLICY "Staff upload hotel buckets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('hotel-logo','room-photos','housekeeping-photos','payment-proofs','guest-documents')
    AND public.is_staff(auth.uid())
  );

-- Staff can update
CREATE POLICY "Staff update hotel buckets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('hotel-logo','room-photos','housekeeping-photos','payment-proofs','guest-documents')
    AND public.is_staff(auth.uid())
  );

-- Staff can delete
CREATE POLICY "Staff delete hotel buckets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('hotel-logo','room-photos','housekeeping-photos','payment-proofs','guest-documents')
    AND public.is_staff(auth.uid())
  );

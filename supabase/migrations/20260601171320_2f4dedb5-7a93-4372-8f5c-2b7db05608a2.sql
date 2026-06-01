
-- Make all buckets private; access via signed URLs
UPDATE storage.buckets SET public = false WHERE id IN ('hotel-logo','room-photos');

-- Drop the broad public SELECT policies
DROP POLICY IF EXISTS "Public read hotel-logo" ON storage.objects;
DROP POLICY IF EXISTS "Public read room-photos" ON storage.objects;

-- Expand staff read policy to cover all hotel buckets
DROP POLICY IF EXISTS "Staff read private buckets" ON storage.objects;
CREATE POLICY "Staff read hotel buckets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('hotel-logo','room-photos','housekeeping-photos','payment-proofs','guest-documents')
    AND public.is_staff(auth.uid())
  );

-- Public bucket for payment screenshot proofs (fallback when Cloudinary unavailable)
-- Run in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "payment_proofs_public_read" ON storage.objects;
CREATE POLICY "payment_proofs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "payment_proofs_service_insert" ON storage.objects;
CREATE POLICY "payment_proofs_service_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');

NOTIFY pgrst, 'reload schema';

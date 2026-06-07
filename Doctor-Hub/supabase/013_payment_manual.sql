-- Manual wallet payments (JazzCash / EasyPaisa etc.) + proof screenshot
-- Run in Supabase SQL Editor after 003_extensions.sql

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT;

NOTIFY pgrst, 'reload schema';

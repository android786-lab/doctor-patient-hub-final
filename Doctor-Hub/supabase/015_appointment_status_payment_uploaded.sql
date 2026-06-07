-- Optional: add payment_uploaded to appointment_status enum (Module 001 schema)
-- Safe to run; backend uses awaiting_verification if this is not applied.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'appointment_status' AND e.enumlabel = 'payment_uploaded'
  ) THEN
    ALTER TYPE appointment_status ADD VALUE 'payment_uploaded';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

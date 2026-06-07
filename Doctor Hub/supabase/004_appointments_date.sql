-- Run if you see: "column appointments.date does not exist"
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS date BIGINT;

UPDATE appointments
SET date = (EXTRACT(EPOCH FROM COALESCE(created_at, NOW())) * 1000)::BIGINT
WHERE date IS NULL;

NOTIFY pgrst, 'reload schema';

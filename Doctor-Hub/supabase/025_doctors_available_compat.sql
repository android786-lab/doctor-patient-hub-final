-- Optional CareLink compatibility column (Module 2 schema does not require this)
-- Run in Supabase SQL Editor if you want explicit available toggles on doctors.

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE;

UPDATE doctors SET available = COALESCE(is_active, true) WHERE available IS NULL;

NOTIFY pgrst, 'reload schema';

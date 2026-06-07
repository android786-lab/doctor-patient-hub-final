-- Doctor weekly availability for patient booking slots (optional — app also uses schedules table)
-- Run in Supabase SQL Editor

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT '{}'::jsonb;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS slot_duration_minutes INT DEFAULT 30;

UPDATE doctors SET weekly_schedule = '{}'::jsonb WHERE weekly_schedule IS NULL;
UPDATE doctors SET slot_duration_minutes = 30 WHERE slot_duration_minutes IS NULL;

NOTIFY pgrst, 'reload schema';

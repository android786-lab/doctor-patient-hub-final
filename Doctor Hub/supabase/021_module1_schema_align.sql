-- Module 1 prompt alignment (run after 005 / createTables)
-- Maps doc fields: users.name, doctors.experience/fee, patients.medical_notes

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

UPDATE users u
SET name = COALESCE(u.name, p.full_name)
FROM patients p
WHERE p.user_id = u.id AND (u.name IS NULL OR u.name = '');

UPDATE users u
SET name = COALESCE(u.name, d.full_name)
FROM doctors d
WHERE d.user_id = u.id AND (u.name IS NULL OR u.name = '');

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience TEXT;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INT;

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS timings JSONB DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';

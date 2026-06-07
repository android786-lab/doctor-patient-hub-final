-- Doctor search API — safe for 001 schema (profiles) AND CareLink schema (name/speciality)
-- Run in Supabase SQL Editor

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 001 schema already has: specialization, bio, is_verified, treatment_type
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Fill full_name + profile_image from profiles (001 / Supabase Auth schema)
UPDATE doctors d
SET full_name = p.full_name
FROM profiles p
WHERE d.user_id = p.id
  AND (d.full_name IS NULL OR d.full_name = '');

UPDATE doctors d
SET profile_image = p.avatar_url
FROM profiles p
WHERE d.user_id = p.id
  AND d.profile_image IS NULL
  AND p.avatar_url IS NOT NULL;

-- CareLink-only columns (run only if those columns exist on your table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'name'
  ) THEN
    UPDATE doctors SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'speciality'
  ) THEN
    UPDATE doctors
    SET specialization = speciality
    WHERE specialization IS NULL AND speciality IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'image'
  ) THEN
    UPDATE doctors
    SET profile_image = image
    WHERE profile_image IS NULL AND image IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'doctors' AND column_name = 'about'
  ) THEN
    UPDATE doctors SET bio = about WHERE bio IS NULL AND about IS NOT NULL;
  END IF;
END $$;

-- Optional: show existing doctors in search (001 defaults is_verified = false)
-- Uncomment the next line if you want ALL current doctors visible in Find Doctors:
-- UPDATE doctors SET is_verified = true, is_active = true;

NOTIFY pgrst, 'reload schema';

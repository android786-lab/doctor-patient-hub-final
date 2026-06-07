-- Module 3 auth: ensure `users` table matches backend/src/controllers/authController.js
-- Run ONLY if register/login fails (missing columns or CareLink-style users table).
-- Skip if you already use profiles + Supabase Auth from 001_initial_schema.sql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fresh users table (Module 2 shape)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('patient', 'doctor', 'assistant', 'admin', 'super_admin')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade CareLink-style users (name/email/password, no role)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE users SET role = 'patient' WHERE role IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- patients / doctors: ensure full_name + phone if missing (for register profile rows)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone TEXT;

-- API must read/write users (fixes "permission denied for table users")
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO postgres, service_role;
GRANT SELECT ON TABLE public.users TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'GRANT ALL ON TABLE public.%I TO postgres, service_role',
      r.tablename
    );
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

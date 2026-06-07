-- Fix: "permission denied for table users" on register/login
-- Run in Supabase → SQL Editor → Run (safe to re-run)

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- All existing public tables (users, doctors, appointments, patients, …)
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
    EXECUTE format(
      'GRANT SELECT ON TABLE public.%I TO anon, authenticated',
      r.tablename
    );
    EXECUTE format(
      'GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      r.tablename
    );
  END LOOP;
END $$;

-- Future tables created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO anon, authenticated;

-- CareLink tables: backend uses service_role; disable RLS if enabled without policies
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

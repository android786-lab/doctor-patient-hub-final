-- Link patients.user_id → public.users (CareLink / Module 3 auth)
-- Run in Supabase SQL Editor when register fails on patients_user_id_fkey
--
-- Old 001 rows store profile UUIDs in patients.user_id — those are NOT in public.users.
-- This script removes orphan patient rows, then points the FK at users.

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_user_id_fkey;

-- Remove dependent rows for patients that cannot map to public.users (dev-safe cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'appointment_id'
  ) THEN
    DELETE FROM payments pay
    WHERE pay.appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.patient_id IN (
        SELECT p.id FROM patients p
        WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id)
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'patient_id'
  ) THEN
    DELETE FROM appointments a
    WHERE a.patient_id IN (
      SELECT p.id FROM patients p
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'medical_history' AND column_name = 'patient_id'
  ) THEN
    DELETE FROM medical_history mh
    WHERE mh.patient_id IN (
      SELECT p.id FROM patients p
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prescriptions' AND column_name = 'patient_id'
  ) THEN
    DELETE FROM prescriptions rx
    WHERE rx.patient_id IN (
      SELECT p.id FROM patients p
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id)
    );
  END IF;
END $$;

DELETE FROM patients p
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id);

ALTER TABLE patients
  ADD CONSTRAINT patients_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

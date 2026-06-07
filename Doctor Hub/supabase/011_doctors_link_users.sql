-- Link doctors.user_id → public.users (CareLink / Module 3 auth)
-- Run in Supabase SQL Editor when admin "Add doctor" fails on doctors_user_id_fkey / profiles FK.
--
-- Old 001 rows store profile UUIDs in doctors.user_id — those are NOT in public.users.
-- This script removes orphan doctor rows, then points the FK at users.

ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_user_id_fkey;

-- Remove dependent rows for doctors that cannot map to public.users (dev-safe cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'appointment_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'doctor_id'
  ) THEN
    DELETE FROM payments pay
    WHERE pay.appointment_id IN (
      SELECT a.id FROM appointments a
      WHERE a.doctor_id IN (
        SELECT d.id FROM doctors d
        WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'appointment_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'doc_id'
  ) THEN
    EXECUTE $sql$
      DELETE FROM payments pay
      WHERE pay.appointment_id IN (
        SELECT a.id FROM appointments a
        WHERE a.doc_id IN (
          SELECT d.id FROM doctors d
          WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
        )
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'doctor_id'
  ) THEN
    DELETE FROM appointments a
    WHERE a.doctor_id IN (
      SELECT d.id FROM doctors d
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'doc_id'
  ) THEN
    EXECUTE $sql$
      DELETE FROM appointments a
      WHERE a.doc_id IN (
        SELECT d.id FROM doctors d
        WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
      )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'schedules'
  ) THEN
    DELETE FROM schedules s
    WHERE s.doctor_id IN (
      SELECT d.id FROM doctors d
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'doctor_clinics'
  ) THEN
    DELETE FROM doctor_clinics dc
    WHERE dc.doctor_id IN (
      SELECT d.id FROM doctors d
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinics' AND column_name = 'doctor_id'
  ) THEN
    DELETE FROM clinics c
    WHERE c.doctor_id IN (
      SELECT d.id FROM doctors d
      WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id)
    );
  END IF;
END $$;

DELETE FROM doctors d
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = d.user_id);

ALTER TABLE doctors
  ADD CONSTRAINT doctors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

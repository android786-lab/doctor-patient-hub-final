-- =============================================================================
-- Doctor Hub — Module 2: complete database schema
-- File: backend/src/config/createTables.sql  (doc path: server/src/config/)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste ALL → Run
--
-- WARNING: If you already ran backend/supabase_schema.sql (CareLink-style tables),
-- this schema is DIFFERENT. Use a fresh project OR drop old public tables first.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (
    role IN ('patient', 'doctor', 'assistant', 'admin', 'super_admin')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- -----------------------------------------------------------------------------
-- 2. patients
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  blood_group TEXT,
  medical_notes TEXT,
  age INT,
  profile_image TEXT
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);

-- -----------------------------------------------------------------------------
-- 3. doctors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  specialization TEXT,
  treatment_type TEXT CHECK (
    treatment_type IS NULL
    OR treatment_type IN ('allopathic', 'homeopathic', 'herbal')
  ),
  bio TEXT,
  experience TEXT,
  experience_years INT DEFAULT 0,
  consultation_fee NUMERIC(10, 2) DEFAULT 0,
  profile_image TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors (user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_treatment_type ON doctors (treatment_type);

-- -----------------------------------------------------------------------------
-- 4. assistants
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors (id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT
);

CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants (user_id);
CREATE INDEX IF NOT EXISTS idx_assistants_doctor_id ON assistants (doctor_id);

-- -----------------------------------------------------------------------------
-- 5. clinics
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  timings JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_clinics_doctor_id ON clinics (doctor_id);

-- -----------------------------------------------------------------------------
-- 6. appointments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics (id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'payment_uploaded',
      'confirmed',
      'cancelled',
      'completed'
    )
  ),
  disease_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments (clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);

-- -----------------------------------------------------------------------------
-- 7. payments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'verified', 'rejected')
  ),
  verified_by UUID REFERENCES assistants (id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments (appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- -----------------------------------------------------------------------------
-- 8. medical_history (append-only — DELETE forbidden)
-- Backend controllers MUST NOT call DELETE on this table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors (id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments (id) ON DELETE SET NULL,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_history_patient_id ON medical_history (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_doctor_id ON medical_history (doctor_id);

-- -----------------------------------------------------------------------------
-- 9. prescriptions (immutable — UPDATE and DELETE forbidden)
-- Backend controllers MUST NOT call UPDATE or DELETE on this table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_history_id UUID NOT NULL REFERENCES medical_history (id) ON DELETE CASCADE,
  medicine_name TEXT,
  dosage TEXT,
  duration TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_history_id ON prescriptions (medical_history_id);

-- =============================================================================
-- Database-level immutability (defense in depth; controllers also enforce)
-- =============================================================================

CREATE OR REPLACE FUNCTION doctor_hub_forbid_medical_history_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'medical_history: DELETE is permanently forbidden (append-only record)';
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_history_no_delete ON medical_history;
CREATE TRIGGER trg_medical_history_no_delete
  BEFORE DELETE ON medical_history
  FOR EACH ROW
  EXECUTE FUNCTION doctor_hub_forbid_medical_history_delete();

CREATE OR REPLACE FUNCTION doctor_hub_forbid_prescriptions_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'prescriptions: UPDATE and DELETE are permanently forbidden';
END;
$$;

DROP TRIGGER IF EXISTS trg_prescriptions_no_update ON prescriptions;
CREATE TRIGGER trg_prescriptions_no_update
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION doctor_hub_forbid_prescriptions_change();

DROP TRIGGER IF EXISTS trg_prescriptions_no_delete ON prescriptions;
CREATE TRIGGER trg_prescriptions_no_delete
  BEFORE DELETE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION doctor_hub_forbid_prescriptions_change();

-- Reload PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';

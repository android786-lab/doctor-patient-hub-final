-- Doctor Hub — Supabase schema + RLS
-- Run via Supabase CLI or SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
CREATE TYPE user_role AS ENUM (
  'patient',
  'doctor',
  'assistant',
  'admin',
  'super_admin'
);

CREATE TYPE treatment_type AS ENUM ('allopathic', 'homeopathic', 'herbal');
CREATE TYPE appointment_status AS ENUM (
  'pending_payment',
  'payment_processing',
  'awaiting_verification',
  'confirmed',
  'completed',
  'cancelled'
);
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  specialization TEXT NOT NULL,
  treatment_type treatment_type NOT NULL DEFAULT 'allopathic',
  diseases TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  experience_years INT DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  blood_group TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctor_clinics (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, clinic_id)
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending_payment',
  symptoms TEXT,
  disease_query TEXT,
  video_room_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'pkr',
  status payment_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medical history: append-only (no DELETE policy)
CREATE TABLE medical_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  diagnosis TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  medicines JSONB NOT NULL DEFAULT '[]',
  instructions TEXT,
  pdf_url TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  symptoms TEXT[] NOT NULL,
  predicted_conditions JSONB NOT NULL,
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  template TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_doctors_diseases ON doctors USING GIN (diseases);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_medical_history_patient ON medical_history(patient_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: own row + admins
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR auth_role() IN ('admin', 'super_admin')
);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Doctors: public read verified; own update
CREATE POLICY doctors_select ON doctors FOR SELECT USING (is_verified = TRUE OR user_id = auth.uid());
CREATE POLICY doctors_update ON doctors FOR UPDATE USING (user_id = auth.uid());

-- Patients: own data
CREATE POLICY patients_select ON patients FOR SELECT USING (
  user_id = auth.uid() OR auth_role() IN ('doctor', 'assistant', 'admin', 'super_admin')
);
CREATE POLICY patients_update ON patients FOR UPDATE USING (user_id = auth.uid());

-- Medical history: no delete; doctors insert; patients read own
CREATE POLICY history_select ON medical_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  OR auth_role() IN ('doctor', 'assistant', 'admin', 'super_admin')
);
CREATE POLICY history_insert ON medical_history FOR INSERT WITH CHECK (
  auth_role() IN ('doctor', 'super_admin')
);
-- Explicitly NO delete/update policies for medical_history (immutable)

-- Prescriptions: read by patient/doctor; insert by doctor only; no update when locked
CREATE POLICY rx_select ON prescriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
  OR auth_role() IN ('admin', 'super_admin')
);
CREATE POLICY rx_insert ON prescriptions FOR INSERT WITH CHECK (
  auth_role() IN ('doctor', 'super_admin')
);

-- Appointments
CREATE POLICY appt_select ON appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
  OR auth_role() IN ('assistant', 'admin', 'super_admin')
);
CREATE POLICY appt_insert ON appointments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
);

-- Reload API schema cache after creating tables
NOTIFY pgrst, 'reload schema';

-- Medical history & prescriptions (Module 2 shape) — run if tables differ from 001
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors (id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments (id) ON DELETE SET NULL,
  diagnosis TEXT,
  notes TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_history_id UUID REFERENCES medical_history (id) ON DELETE CASCADE,
  medicine_name TEXT,
  dosage TEXT,
  duration TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medical_history_id UUID;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medicine_name TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dosage TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS instructions TEXT;

NOTIFY pgrst, 'reload schema';

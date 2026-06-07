-- Doctor module: date-based schedules + clinic fields

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  time_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_date ON doctor_schedules (doctor_id, schedule_date);

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS available_days JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS end_time TIME;

UPDATE clinics SET clinic_name = name WHERE clinic_name IS NULL AND name IS NOT NULL;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS treatment_type TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT;

NOTIFY pgrst, 'reload schema';

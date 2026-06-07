-- Clinics for doctor dashboard (Module 2 shape)
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  timings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinics_doctor_id ON clinics (doctor_id);

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

NOTIFY pgrst, 'reload schema';

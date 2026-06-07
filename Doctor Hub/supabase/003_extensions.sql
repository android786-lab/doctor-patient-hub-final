-- Doctor Hub extensions (run AFTER backend/supabase_schema.sql)

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS treatment_type TEXT DEFAULT 'allopathic';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS diseases TEXT[] DEFAULT '{}';

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS symptoms TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS disease_query TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  diagnosis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  medicines JSONB NOT NULL DEFAULT '[]',
  instructions TEXT,
  is_locked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symptoms TEXT[] NOT NULL,
  predicted_conditions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

NOTIFY pgrst, 'reload schema';

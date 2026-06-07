-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens (token_hash);

-- Patient report attachments on medical history
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'doctor_visit';

-- E-prescription PDF URL cache
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pdf_url TEXT;

NOTIFY pgrst, 'reload schema';

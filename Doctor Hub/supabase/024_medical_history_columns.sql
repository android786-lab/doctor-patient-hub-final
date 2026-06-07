-- Align medical_history with app (patient lab uploads, doctor notes)
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'doctor_visit';
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS symptoms TEXT;
ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';

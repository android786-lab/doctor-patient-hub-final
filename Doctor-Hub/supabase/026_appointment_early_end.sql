-- Early appointment end metadata (doctor/patient can end live consultation)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS ended_early BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS early_end_reason TEXT,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_by TEXT;

COMMENT ON COLUMN appointments.early_end_reason IS 'Required when doctor ends before scheduled slot end';
COMMENT ON COLUMN appointments.ended_by IS 'patient | doctor';

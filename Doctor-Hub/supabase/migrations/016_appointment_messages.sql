-- In-appointment chat (patient ↔ doctor). Run in Supabase SQL Editor if messages fail.

CREATE TABLE IF NOT EXISTS appointment_messages (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  appointment_id UUID NOT NULL,

  sender_id UUID NOT NULL,

  sender_role TEXT NOT NULL CHECK (sender_role IN ('patient', 'doctor')),

  body TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);



CREATE INDEX IF NOT EXISTS idx_appointment_messages_appt

  ON appointment_messages (appointment_id, created_at);



ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room_id TEXT;



GRANT ALL ON TABLE appointment_messages TO postgres, service_role;



NOTIFY pgrst, 'reload schema';


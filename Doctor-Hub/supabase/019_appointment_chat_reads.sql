-- Track when each user last read an appointment chat (for unread badges / toasts)

CREATE TABLE IF NOT EXISTS appointment_chat_reads (

  appointment_id UUID NOT NULL,

  user_id UUID NOT NULL,

  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (appointment_id, user_id)

);



CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON appointment_chat_reads (user_id);



GRANT ALL ON TABLE appointment_chat_reads TO postgres, service_role;



NOTIFY pgrst, 'reload schema';


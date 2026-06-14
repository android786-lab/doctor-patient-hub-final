-- OTP-based password reset (6-digit code, 10-minute expiry)
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user ON password_reset_otps (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps (email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_hash ON password_reset_otps (otp_hash);

NOTIFY pgrst, 'reload schema';

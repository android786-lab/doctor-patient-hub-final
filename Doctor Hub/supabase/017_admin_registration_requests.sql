-- Admin registration requests (super admin approval required)
CREATE TABLE IF NOT EXISTS admin_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_reg_email_pending
  ON admin_registration_requests (LOWER(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_reg_status ON admin_registration_requests (status);

GRANT ALL ON TABLE admin_registration_requests TO postgres, service_role;

NOTIFY pgrst, 'reload schema';

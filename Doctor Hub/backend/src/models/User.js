/**
 * User model (Supabase table: users)
 * Doc prompt used Sequelize/MySQL — this project uses Supabase + service role from backend.
 */
export const TABLE = 'users'

export const FIELDS = {
  id: 'UUID',
  name: 'TEXT',
  email: 'TEXT UNIQUE',
  password: 'TEXT (bcrypt hash)',
  role: 'patient | doctor | assistant | admin | super_admin',
  phone: 'TEXT optional',
  is_active: 'BOOLEAN',
  created_at: 'TIMESTAMPTZ',
}

export const ROLES = ['patient', 'doctor', 'assistant', 'admin', 'super_admin']

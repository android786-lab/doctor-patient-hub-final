/**
 * Doctor Hub — Supabase admin client (service role).
 * Path: backend/src/config/supabase.js  (documentation "server" = this backend app)
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env — never expose to the browser.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase env: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) in backend/.env'
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: { schema: 'public' },
})

/**
 * Immutable records (also enforced in backend controllers):
 * - medical_history: DELETE is permanently forbidden (append-only).
 * - prescriptions: UPDATE and DELETE are permanently forbidden.
 */
export const IMMUTABLE_RULES = {
  medicalHistory: { delete: false },
  prescriptions: { update: false, delete: false },
}

export async function withRetry(queryFn, retries = 3, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await queryFn(supabase)
      if (result?.error) throw result.error
      return result
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, delayMs * attempt))
    }
  }
}

export default supabase

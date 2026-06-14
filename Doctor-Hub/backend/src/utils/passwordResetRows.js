import crypto from 'crypto'
import supabase from '../config/supabase.js'

const TOKEN_BYTES = 32
const EXPIRY_HOURS = 1
const POST_OTP_RESET_MINUTES = 15

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateResetToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex')
  return { token, tokenHash: hashToken(token) }
}

export async function createPasswordResetToken(userId, { expiryMinutes } = {}) {
  const { token, tokenHash } = generateResetToken()
  const minutes = expiryMinutes ?? EXPIRY_HOURS * 60
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString()

  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)

  const { error } = await supabase.from('password_reset_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  })

  if (error) throw error
  return { token, expiresAt }
}

export async function findValidResetToken(plainToken) {
  const tokenHash = hashToken(plainToken)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export { POST_OTP_RESET_MINUTES }

export async function markResetTokenUsed(id) {
  const { error } = await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

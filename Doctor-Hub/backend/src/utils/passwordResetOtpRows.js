import crypto from 'crypto'
import supabase from '../config/supabase.js'

const OTP_EXPIRY_MINUTES = 10

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex')
}

/** Cryptographically random 6-digit OTP (100000–999999). */
export function generateSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

export async function createPasswordResetOtp(userId, email) {
  const otp = generateSixDigitOtp()
  const otpHash = hashOtp(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
  const normalizedEmail = email.toLowerCase().trim()

  await supabase
    .from('password_reset_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)

  const { error } = await supabase.from('password_reset_otps').insert({
    user_id: userId,
    email: normalizedEmail,
    otp_hash: otpHash,
    expires_at: expiresAt,
  })

  if (error) throw error
  return { otp, expiresAt, expiresInMinutes: OTP_EXPIRY_MINUTES }
}

export async function findValidOtp(email, plainOtp) {
  const normalizedEmail = email.toLowerCase().trim()
  const otpHash = hashOtp(plainOtp)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('password_reset_otps')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('otp_hash', otpHash)
    .is('used_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function markOtpUsed(id) {
  const { error } = await supabase
    .from('password_reset_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function invalidateOtpsForUser(userId) {
  const { error } = await supabase
    .from('password_reset_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)
  if (error) throw error
}

import nodemailer from 'nodemailer'

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)
  )
}

function smtpPassword() {
  return String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '')
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPassword(),
    },
  })
}

function smtpFrom() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'Doctor Hub <noreply@doctorhub.local>'
}

/** Legacy email-link reset (kept for reference; OTP flow uses sendPasswordResetOtpEmail). */
export async function sendPasswordResetEmail({ to, resetUrl, userName }) {
  const from = smtpFrom()

  const subject = 'Reset your Doctor Hub password'
  const text = `Hello ${userName || 'there'},\n\nReset your password using this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.\n\n— Doctor Hub`
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0d9488;margin:0 0 12px">Doctor Hub</h2>
      <p>Hello ${userName || 'there'},</p>
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
      </p>
      <p style="font-size:13px;color:#64748b">Or copy this link:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size:12px;color:#94a3b8;margin-top:24px">If you did not request a reset, you can ignore this email.</p>
    </div>
  `

  if (!isSmtpConfigured()) {
    console.log('[email:dev] Password reset (SMTP not configured):')
    console.log(`  To: ${to}`)
    console.log(`  URL: ${resetUrl}`)
    return { sent: false, devLink: resetUrl }
  }

  try {
    const transport = createTransport()
    await transport.sendMail({ from, to, subject, text, html })
    return { sent: true }
  } catch (err) {
    console.error('[email] Password reset link failed:', err.message)
    return { sent: false, devLink: resetUrl, error: err.message }
  }
}

export async function sendPasswordResetOtpEmail({ to, otp, userName, expiresInMinutes = 10 }) {
  const from = smtpFrom()

  const subject = 'Your Doctor Hub password reset code'
  const text = `Hello ${userName || 'there'},\n\nYour password reset code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.\n\n— Doctor Hub`
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0d9488;margin:0 0 12px">Doctor Hub</h2>
      <p>Hello ${userName || 'there'},</p>
      <p>Use this one-time code to reset your password. It expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:0.25em;color:#0f172a">${otp}</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:24px">If you did not request a reset, you can ignore this email.</p>
    </div>
  `

  if (!isSmtpConfigured()) {
    console.log('[email:dev] Password reset OTP (SMTP not configured):')
    console.log(`  To: ${to}`)
    console.log(`  OTP: ${otp}`)
    return { sent: false, devOtp: otp }
  }

  try {
    const transport = createTransport()
    await transport.sendMail({ from, to, subject, text, html })
    return { sent: true }
  } catch (err) {
    console.error('[email] Password reset OTP failed:', err.message)
    console.log(`[email:fallback] OTP for ${to}: ${otp}`)
    return { sent: false, devOtp: otp, error: err.message }
  }
}

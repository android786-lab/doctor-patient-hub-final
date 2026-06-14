import nodemailer from 'nodemailer'

function smtpPassword() {
  return String(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '')
}

function brevoKey() {
  return String(process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || '').trim()
}

function isBrevoRestKey(key = brevoKey()) {
  return key.startsWith('xkeysib-')
}

function isBrevoSmtpKey(key = brevoKey()) {
  return key.startsWith('xsmtpsib-')
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword())
}

function isHttpEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || brevoKey())
}

function defaultFrom() {
  return process.env.RESEND_FROM || process.env.BREVO_SENDER_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'Doctor Hub <noreply@doctorhub.local>'
}

/** Parse `"Doctor Hub <email@x.com>"` or plain email */
function parseFromAddress(from) {
  const raw = String(from || '').trim()
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() }
  }
  return { name: 'Doctor Hub', email: raw }
}

function createSmtpTransport() {
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

async function sendViaResend({ to, subject, text, html, from }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || process.env.RESEND_FROM || defaultFrom(),
      to: [to],
      subject,
      html,
      text,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.message || body?.error || `Resend HTTP ${res.status}`
    throw new Error(msg)
  }
  return { sent: true, provider: 'resend' }
}

/** Brevo REST API — requires xkeysib- key (API Keys tab, NOT SMTP tab) */
async function sendViaBrevoRest({ to, subject, text, html, from, apiKey }) {
  const parsed = parseFromAddress(from || defaultFrom())
  const senderEmail = process.env.BREVO_SENDER_EMAIL || parsed.email

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: parsed.name, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.message || body?.error || `Brevo HTTP ${res.status}`
    throw new Error(msg)
  }
  return { sent: true, provider: 'brevo-api' }
}

/** Brevo SMTP relay — requires xsmtpsib- key + BREVO_SMTP_LOGIN from Brevo SMTP tab */
async function sendViaBrevoSmtpRelay({ to, subject, text, html, from, smtpKey }) {
  const login = process.env.BREVO_SMTP_LOGIN
  if (!login) {
    throw new Error(
      'Brevo SMTP key detected but BREVO_SMTP_LOGIN is missing. Use xkeysib- API key instead, or set BREVO_SMTP_LOGIN from Brevo → SMTP tab.'
    )
  }

  const transport = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user: login, pass: smtpKey },
  })

  await transport.sendMail({
    from: from || defaultFrom(),
    to,
    subject,
    text,
    html,
  })
  return { sent: true, provider: 'brevo-smtp' }
}

async function sendViaBrevo({ to, subject, text, html, from }) {
  const key = brevoKey()
  if (!key) return null

  if (isBrevoRestKey(key)) {
    return sendViaBrevoRest({ to, subject, text, html, from, apiKey: key })
  }

  if (isBrevoSmtpKey(key)) {
    return sendViaBrevoSmtpRelay({ to, subject, text, html, from, smtpKey: key })
  }

  throw new Error(
    'Invalid Brevo key format. Create an API key (starts with xkeysib-) under Brevo → SMTP & API → API Keys.'
  )
}

async function sendViaSmtp({ to, subject, text, html, from }) {
  if (!isSmtpConfigured()) return null
  const transport = createSmtpTransport()
  await transport.sendMail({ from: from || defaultFrom(), to, subject, text, html })
  return { sent: true, provider: 'smtp' }
}

/**
 * Deliver email — HTTP APIs first (works on Vercel), SMTP for local dev.
 */
async function deliverEmail({ to, subject, text, html, from = defaultFrom() }) {
  const errors = []

  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend({ to, subject, text, html, from })
    } catch (err) {
      console.error('[email] Resend failed:', err.message)
      errors.push(err.message)
    }
  }

  if (brevoKey()) {
    try {
      return await sendViaBrevo({ to, subject, text, html, from })
    } catch (err) {
      console.error('[email] Brevo failed:', err.message)
      errors.push(err.message)
    }
  }

  if (isSmtpConfigured()) {
    try {
      return await sendViaSmtp({ to, subject, text, html, from })
    } catch (err) {
      console.error('[email] SMTP failed:', err.message)
      errors.push(err.message)
    }
  }

  if (!isHttpEmailConfigured() && !isSmtpConfigured()) {
    return { sent: false, error: 'Email not configured' }
  }

  return { sent: false, error: errors.join('; ') || 'All email providers failed' }
}

/** Legacy email-link reset (kept for reference; OTP flow uses sendPasswordResetOtpEmail). */
export async function sendPasswordResetEmail({ to, resetUrl, userName }) {
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

  const result = await deliverEmail({ to, subject, text, html })
  if (result?.sent) return { sent: true }

  console.log('[email:dev] Password reset (email not sent):')
  console.log(`  To: ${to}`)
  console.log(`  URL: ${resetUrl}`)
  return { sent: false, devLink: resetUrl, error: result?.error }
}

export async function sendPasswordResetOtpEmail({ to, otp, userName, expiresInMinutes = 10 }) {
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

  const result = await deliverEmail({ to, subject, text, html })
  if (result?.sent) {
    console.log(`[email] OTP sent via ${result.provider} to ${to}`)
    return { sent: true }
  }

  console.log('[email:dev] Password reset OTP (email not sent):')
  console.log(`  To: ${to}`)
  console.log(`  OTP: ${otp}`)
  if (result?.error) console.log(`  Error: ${result.error}`)
  return { sent: false, devOtp: otp, error: result?.error }
}

export { isHttpEmailConfigured, isSmtpConfigured }

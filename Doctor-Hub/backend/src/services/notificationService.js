import supabase from '../config/supabase.js'

function normalizePhone(raw) {
  if (!raw) return null
  let p = String(raw).replace(/\s/g, '')
  if (p.startsWith('0') && p.length === 11) {
    p = `+92${p.slice(1)}`
  }
  if (!p.startsWith('+')) {
    p = `+${p.replace(/^\+/, '')}`
  }
  return p
}

function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  )
}

async function logNotification({ userId, channel, template, payload, status }) {
  try {
    await supabase.from('notifications_log').insert({
      user_id: userId || null,
      channel,
      template,
      payload: payload || {},
      status,
    })
  } catch (err) {
    console.warn('notifications_log insert skipped:', err.message)
  }
}

export async function sendWhatsApp({ toPhone, body, userId, template }) {
  const to = normalizePhone(toPhone)
  if (!to) {
    return { sent: false, reason: 'no_phone' }
  }

  if (!isTwilioConfigured()) {
    console.log(`[whatsapp:dev] To ${to}: ${body}`)
    await logNotification({
      userId,
      channel: 'whatsapp',
      template: template || 'generic',
      payload: { to, body },
      status: 'dev_logged',
    })
    return { sent: false, devLogged: true }
  }

  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64')

  const from = process.env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? process.env.TWILIO_WHATSAPP_FROM
    : `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`

  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: toWa,
        Body: body,
      }),
    }
  )

  const data = await res.json().catch(() => ({}))
  const ok = res.ok

  await logNotification({
    userId,
    channel: 'whatsapp',
    template: template || 'generic',
    payload: { to: toWa, sid: data.sid, error: data.message },
    status: ok ? 'sent' : 'failed',
  })

  if (!ok) {
    console.warn('Twilio WhatsApp failed:', data.message || res.status)
    return { sent: false, error: data.message }
  }

  return { sent: true, sid: data.sid }
}

async function loadUserContact(userId) {
  if (!userId) return null

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, phone')
    .eq('id', userId)
    .maybeSingle()

  if (user) return user

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return null
  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    phone: profile.phone,
  }
}

export async function notifyPaymentProofReceived({ appointmentId, patientUserId }) {
  const user = await loadUserContact(patientUserId)
  if (!user?.phone) return { sent: false, reason: 'no_phone' }

  const body = `Doctor Hub: We received your payment proof for appointment #${String(appointmentId).slice(0, 8)}. Our team will verify it shortly.`
  return sendWhatsApp({
    toPhone: user.phone,
    body,
    userId: user.id,
    template: 'payment_proof_received',
  })
}

export async function notifyAppointmentConfirmed({ appointmentId, patientUserId, slotLabel }) {
  const user = await loadUserContact(patientUserId)
  if (!user?.phone) return { sent: false, reason: 'no_phone' }

  const when = slotLabel ? ` Scheduled: ${slotLabel}.` : ''
  const body = `Doctor Hub: Your appointment is CONFIRMED.${when} You can message your doctor from My Appointments. Ref: ${String(appointmentId).slice(0, 8)}`
  return sendWhatsApp({
    toPhone: user.phone,
    body,
    userId: user.id,
    template: 'appointment_confirmed',
  })
}

export async function notifyPaymentRejected({
  appointmentId,
  patientUserId,
  reason,
  slotLabel,
}) {
  const user = await loadUserContact(patientUserId)
  const shortId = String(appointmentId || '').slice(0, 8)
  const when = slotLabel ? ` (${slotLabel})` : ''
  const note = reason?.trim() || 'Payment could not be verified'
  const message = `Your payment for appointment #${shortId}${when} was rejected. Reason: ${note}. Please re-upload payment proof from My Appointments.`

  if (user?.phone) {
    await sendWhatsApp({
      toPhone: user.phone,
      body: `Doctor Hub: ${message}`,
      userId: user.id,
      template: 'payment_rejected',
    })
  }

  await logNotification({
    userId: patientUserId || user?.id || null,
    channel: 'in_app',
    template: 'payment_rejected',
    payload: {
      type: 'payment_rejected',
      appointment_id: appointmentId,
      message,
      read: false,
    },
    status: user?.phone ? 'sent' : 'logged',
  })

  try {
    await supabase.from('user_notifications').insert({
      user_id: patientUserId || user?.id,
      type: 'payment_rejected',
      message,
      read: false,
      appointment_id: appointmentId,
    })
  } catch {
    /* optional table — notifications_log above is the fallback */
  }

  return { sent: Boolean(user?.phone), message }
}

export async function notifyFromAppointmentRow(appointmentRow, event, extra = {}) {
  const patientUserId =
    appointmentRow.user_id ||
    appointmentRow.patient_user_id ||
    appointmentRow.user_data?.id ||
    null

  if (event === 'payment_uploaded') {
    return notifyPaymentProofReceived({
      appointmentId: appointmentRow.id,
      patientUserId,
    })
  }
  if (event === 'confirmed') {
    const slotLabel = [appointmentRow.slot_date, appointmentRow.slot_time]
      .filter(Boolean)
      .join(' ')
    return notifyAppointmentConfirmed({
      appointmentId: appointmentRow.id,
      patientUserId,
      slotLabel,
    })
  }
  if (event === 'payment_rejected') {
    const slotLabel = [appointmentRow.slot_date, appointmentRow.slot_time]
      .filter(Boolean)
      .join(' ')
    return notifyPaymentRejected({
      appointmentId: appointmentRow.id,
      patientUserId,
      reason: extra.reason,
      slotLabel,
    })
  }
  return { sent: false }
}

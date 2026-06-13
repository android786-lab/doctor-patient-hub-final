import supabase from '../config/supabase.js'
import { resolvePatientId } from './medicalHistoryRows.js'
import { resolveDoctorContextIdsOrCreate } from './appointmentDoctorRows.js'
import {
  normalizeRoomId,
  resolveVideoMeetingUrl,
  buildVideoInviteMessage,
  extractVideoUrlFromMessage,
} from './videoMeeting.js'

const DEFAULT_SLOT_MINUTES = 60
const EARLY_JOIN_MINUTES = 10
const POST_SLOT_GRACE_MINUTES = 15

function normalizeSlotDuration(raw) {
  const n = parseInt(raw, 10)
  if (Number.isFinite(n) && n >= 15 && n <= 180) return n
  return DEFAULT_SLOT_MINUTES
}

/** Consultation length from appointment snapshot or doctor schedule (default 1 hour). */
export function resolveAppointmentSlotDuration(appointment) {
  if (appointment?.slot_duration_minutes != null) {
    return normalizeSlotDuration(appointment.slot_duration_minutes)
  }
  const doc = appointment?.doc_data
  if (doc && doc.slot_duration_minutes != null) {
    return normalizeSlotDuration(doc.slot_duration_minutes)
  }
  return DEFAULT_SLOT_MINUTES
}

async function resolveAppointmentSlotDurationAsync(appointment) {
  const fromRow = resolveAppointmentSlotDuration(appointment)
  if (appointment?.slot_duration_minutes != null) return fromRow
  if (appointment?.doc_data?.slot_duration_minutes != null) return fromRow

  const docId = appointment?.doc_id || appointment?.doctor_id
  if (!docId) return DEFAULT_SLOT_MINUTES

  try {
    const { data } = await supabase
      .from('doctors')
      .select('slot_duration_minutes')
      .eq('id', docId)
      .maybeSingle()
    if (data?.slot_duration_minutes != null) {
      return normalizeSlotDuration(data.slot_duration_minutes)
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_SLOT_MINUTES
}

export async function getAppointmentChatWindowForRow(appointment) {
  const durationMin = await resolveAppointmentSlotDurationAsync(appointment)
  return getAppointmentChatWindow(appointment, durationMin)
}

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

export function isMissingMessagesTable(err) {
  const msg = err?.message || ''
  return (
    /appointment_messages/i.test(msg) &&
    /relation|does not exist|schema cache/i.test(msg)
  )
}

export const CHAT_SETUP_ERROR =
  'Chat is temporarily unavailable. Please try again later.'

export function parseAppointmentStart(appointment) {
  if (appointment?.scheduled_at) {
    const d = new Date(appointment.scheduled_at)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (appointment?.slot_date && appointment?.slot_time) {
    const parts = String(appointment.slot_date).split('_')
    if (parts.length !== 3) return null
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    const m = String(appointment.slot_time).match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
    let h = 10
    let min = 0
    if (m) {
      h = parseInt(m[1], 10)
      min = parseInt(m[2], 10)
      const ap = (m[3] || '').toLowerCase()
      if (ap === 'pm' && h < 12) h += 12
      if (ap === 'am' && h === 12) h = 0
    }
    return new Date(year, month, day, h, min, 0)
  }
  return null
}

export function getAppointmentChatWindow(appointment, durationMin = DEFAULT_SLOT_MINUTES) {
  const start = parseAppointmentStart(appointment)
  if (!start) {
    return { open: false, reason: 'Appointment time is not set on this booking' }
  }
  const duration = normalizeSlotDuration(durationMin)
  const windowStart = new Date(start.getTime() - EARLY_JOIN_MINUTES * 60 * 1000)
  const windowEnd = new Date(
    start.getTime() + duration * 60 * 1000 + POST_SLOT_GRACE_MINUTES * 60 * 1000
  )
  const now = new Date()

  if (now < windowStart) {
    return {
      open: false,
      reason: `Chat opens ${windowStart.toLocaleString()} (${EARLY_JOIN_MINUTES} min before your slot)`,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      slotStart: start.toISOString(),
      slotDurationMinutes: duration,
    }
  }
  if (now > windowEnd) {
    return {
      open: false,
      reason: 'This appointment slot has ended',
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      slotStart: start.toISOString(),
      slotDurationMinutes: duration,
    }
  }
  return {
    open: true,
    reason: null,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    slotStart: start.toISOString(),
    slotDurationMinutes: duration,
  }
}

export function isConsultEligible(appointment) {
  if (!appointment) return false
  if (appointment.cancelled === true || appointment.status === 'cancelled') return false
  if (appointment.status === 'confirmed') return true
  if (appointment.is_completed || appointment.status === 'completed') return false
  return false
}

/** Read message history for confirmed or completed visits (not only during live slot). */
export function canReadConsultChat(appointment) {
  if (!appointment) return false
  if (appointment.cancelled === true || appointment.status === 'cancelled') return false
  if (appointment.status === 'confirmed') return true
  if (appointment.is_completed || appointment.status === 'completed') return true
  return false
}

async function loadAppointment(appointmentId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()
  if (error) throw error
  return data
}

async function assertPatientAccess(appointment, userId) {
  if (appointment.user_id === userId) return true
  const patientId = await resolvePatientId({ user_id: userId })
  return patientId && appointment.patient_id === patientId
}

async function assertDoctorAccess(appointment, doctorUserId) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(doctorUserId)
  if (!doctorRowId) return false
  const apptDocId = appointment.doc_id || appointment.doctor_id
  return apptDocId === doctorRowId
}

export async function resolveChatParticipant(appointmentId, { userId, role }) {
  const appointment = await loadAppointment(appointmentId)
  let allowed = false
  if (role === 'patient') allowed = await assertPatientAccess(appointment, userId)
  if (role === 'doctor') allowed = await assertDoctorAccess(appointment, userId)
  if (!allowed) {
    const err = new Error('You cannot access this appointment chat')
    err.status = 403
    throw err
  }
  return { appointment, role, userId }
}

export async function getChatSessionForUser(appointmentId, context) {
  const { appointment, role } = await resolveChatParticipant(appointmentId, context)
  const eligible = isConsultEligible(appointment)
  const window = await getAppointmentChatWindowForRow(appointment)

  const peerName =
    role === 'patient'
      ? appointment.doc_data?.name || 'Doctor'
      : appointment.user_data?.name || 'Patient'

  const canRead = canReadConsultChat(appointment)
  const canSend = eligible && window.open

  const videoRoomId = appointment.video_room_id || null
  let videoUrl = null
  let videoProvider = null
  if (videoRoomId) {
    try {
      const meeting = await resolveVideoMeetingUrl(videoRoomId, {
        displayName: role === 'doctor' ? peerName : undefined,
      })
      videoUrl = meeting.videoUrl
      videoProvider = meeting.provider
    } catch {
      /* optional */
    }
  }

  return {
    appointmentId,
    role,
    peerName,
    eligible,
    canReadChat: canRead,
    canSendChat: canSend,
    /** @deprecated use canSendChat — kept for older clients */
    chatOpen: canSend,
    historyOnly: canRead && !canSend,
    window,
    videoRoomId,
    videoUrl,
    videoProvider,
    status: appointment.status,
    slotLabel: appointment.slot_date
      ? `${appointment.slot_date} ${appointment.slot_time || ''}`.trim()
      : appointment.scheduled_at,
  }
}

export async function listMessages(appointmentId, context) {
  await resolveChatParticipant(appointmentId, context)
  const { data, error } = await supabase
    .from('appointment_messages')
    .select('id, appointment_id, sender_id, sender_role, body, created_at')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true })

  if (error) {
    if (isMissingMessagesTable(error)) {
      const e = new Error(CHAT_SETUP_ERROR)
      e.code = 'CHAT_NOT_CONFIGURED'
      throw e
    }
    throw error
  }
  return data || []
}

export async function sendMessage(appointmentId, context, body) {
  const text = String(body || '').trim()
  if (!text) throw new Error('Message cannot be empty')
  if (text.length > 2000) throw new Error('Message is too long')

  const { appointment, role, userId } = await resolveChatParticipant(appointmentId, context)
  if (!isConsultEligible(appointment)) {
    throw new Error('Chat is only available for confirmed appointments')
  }
  const window = await getAppointmentChatWindowForRow(appointment)
  if (!window.open) {
    throw new Error(window.reason || 'Chat is not open yet')
  }

  const { data, error } = await supabase
    .from('appointment_messages')
    .insert({
      appointment_id: appointmentId,
      sender_id: userId,
      sender_role: role,
      body: text,
    })
    .select()
    .single()

  if (error) {
    if (isMissingMessagesTable(error)) {
      const e = new Error(CHAT_SETUP_ERROR)
      e.code = 'CHAT_NOT_CONFIGURED'
      throw e
    }
    throw error
  }
  return data
}

async function postVideoInviteIfNeeded(appointmentId, context, videoUrl) {
  const { role, userId } = context
  const { appointment } = await resolveChatParticipant(appointmentId, context)

  const senderName =
    role === 'doctor'
      ? appointment.doc_data?.name || 'Doctor'
      : appointment.user_data?.name || 'Patient'

  const body = buildVideoInviteMessage({ senderName, role, videoUrl })

  const { data: recent } = await supabase
    .from('appointment_messages')
    .select('id, body, created_at, sender_id')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false })
    .limit(5)

  const twoMinAgo = Date.now() - 2 * 60 * 1000
  const duplicate = (recent || []).some(
    (m) =>
      m.sender_id === userId &&
      extractVideoUrlFromMessage(m.body) === videoUrl &&
      new Date(m.created_at).getTime() > twoMinAgo
  )
  if (duplicate) return null

  const { data, error } = await supabase
    .from('appointment_messages')
    .insert({
      appointment_id: appointmentId,
      sender_id: userId,
      sender_role: role,
      body,
    })
    .select()
    .single()

  if (error) {
    if (isMissingMessagesTable(error)) return null
    throw error
  }
  return data
}

export async function getOrCreateVideoRoom(appointmentId, context) {
  const { appointment, role, userId } = await resolveChatParticipant(appointmentId, context)
  if (!isConsultEligible(appointment)) {
    throw new Error('Video is only for confirmed appointments')
  }
  const window = await getAppointmentChatWindowForRow(appointment)
  if (!window.open) {
    throw new Error(window.reason || 'Video opens during your appointment slot only')
  }

  let roomId = appointment.video_room_id
  if (!roomId) {
    roomId = normalizeRoomId(appointmentId)
    const { error } = await supabase
      .from('appointments')
      .update({ video_room_id: roomId })
      .eq('id', appointmentId)
    if (error && !isMissingColumn(error)) throw error
  }

  const senderName =
    role === 'doctor'
      ? appointment.doc_data?.name || 'Doctor'
      : appointment.user_data?.name || 'Patient'

  const meeting = await resolveVideoMeetingUrl(roomId, { displayName: senderName })
  const inviteMessage = await postVideoInviteIfNeeded(
    appointmentId,
    { userId, role },
    meeting.videoUrl
  )

  return {
    roomId,
    videoUrl: meeting.videoUrl,
    embedUrl: meeting.embedUrl,
    provider: meeting.provider,
    hostHint: meeting.hostHint,
    inviteSent: !!inviteMessage,
    inviteMessage,
  }
}

import supabase from '../config/supabase.js'
import { listPatientAppointmentsForUser } from './patientAppointmentRows.js'
import { fetchAppointmentsForDoctor } from './appointmentDoctorRows.js'
import {
  canReadConsultChat,
  isMissingMessagesTable,
  CHAT_SETUP_ERROR,
} from './appointmentChatRows.js'
import { isWebRtcSignalBody } from './webrtcSignalRows.js'

function isMissingReadsTable(err) {
  const msg = err?.message || ''
  return /appointment_chat_reads/i.test(msg) && /relation|does not exist|schema cache/i.test(msg)
}

async function loadReadsForUser(userId, appointmentIds) {
  if (!appointmentIds.length) return {}
  const { data, error } = await supabase
    .from('appointment_chat_reads')
    .select('appointment_id, last_read_at')
    .eq('user_id', userId)
    .in('appointment_id', appointmentIds)

  if (error) {
    if (isMissingReadsTable(error)) return null
    throw error
  }
  const map = {}
  for (const row of data || []) {
    map[row.appointment_id] = row.last_read_at
  }
  return map
}

export async function markAppointmentChatRead(appointmentId, userId) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('appointment_chat_reads').upsert(
    {
      appointment_id: appointmentId,
      user_id: userId,
      last_read_at: now,
      updated_at: now,
    },
    { onConflict: 'appointment_id,user_id' }
  )
  if (error) {
    if (isMissingReadsTable(error)) return
    throw error
  }
}

function peerNameForAppointment(appointment, role) {
  if (role === 'patient') {
    return appointment.doc_data?.name || appointment.doctor_name || 'Doctor'
  }
  return appointment.user_data?.name || appointment.patient_name || 'Patient'
}

function slotLabel(appointment) {
  if (appointment.slot_date) {
    return `${appointment.slot_date} ${appointment.slot_time || ''}`.trim()
  }
  if (appointment.scheduled_at) {
    const d = new Date(appointment.scheduled_at)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }
  }
  return ''
}

function previewText(body) {
  if (!body || isWebRtcSignalBody(body)) return ''
  if (body.includes('🎥 VIDEO_CALL')) {
    return 'Video consultation started — tap to join'
  }
  return String(body).slice(0, 160)
}

async function fetchEligibleAppointments(userId, role) {
  if (role === 'patient') {
    const list = await listPatientAppointmentsForUser(userId)
    return (list || []).filter(canReadConsultChat)
  }
  const rows = await fetchAppointmentsForDoctor(userId)
  return (rows || []).filter(canReadConsultChat)
}

async function buildChatConversationData(userId, role) {
  const myRole = role === 'doctor' ? 'doctor' : 'patient'
  const appointments = await fetchEligibleAppointments(userId, myRole)
  const ids = appointments.map((a) => a.id).filter(Boolean)

  if (!ids.length) {
    return {
      conversations: [],
      totalUnread: 0,
      chatConfigured: true,
      readsConfigured: true,
    }
  }

  let readMap = await loadReadsForUser(userId, ids)
  if (readMap === null) {
    return {
      conversations: appointments.map((appt) => ({
        appointmentId: appt.id,
        peerName: peerNameForAppointment(appt, myRole),
        slotLabel: slotLabel(appt),
        unreadCount: 0,
        preview: '',
        lastMessageAt: null,
        status: appt.status || null,
      })),
      totalUnread: 0,
      chatConfigured: true,
      readsConfigured: false,
    }
  }

  const { data: messages, error: msgErr } = await supabase
    .from('appointment_messages')
    .select('id, appointment_id, sender_role, body, created_at')
    .in('appointment_id', ids)
    .order('created_at', { ascending: false })

  if (msgErr) {
    if (isMissingMessagesTable(msgErr)) {
      const e = new Error(CHAT_SETUP_ERROR)
      e.code = 'CHAT_NOT_CONFIGURED'
      throw e
    }
    throw msgErr
  }

  const byAppt = {}
  for (const id of ids) {
    byAppt[id] = { unread: 0, latest: null }
  }

  for (const m of messages || []) {
    const bucket = byAppt[m.appointment_id]
    if (!bucket) continue
    if (isWebRtcSignalBody(m.body)) continue

    if (!bucket.latest) bucket.latest = m
    if (m.sender_role === myRole) continue
    const lastReadRaw = readMap[m.appointment_id]
    if (lastReadRaw && new Date(m.created_at) <= new Date(lastReadRaw)) continue
    bucket.unread += 1
  }

  const conversations = []
  let totalUnread = 0

  for (const appt of appointments) {
    const bucket = byAppt[appt.id] || { unread: 0, latest: null }
    totalUnread += bucket.unread
    conversations.push({
      appointmentId: appt.id,
      peerName: peerNameForAppointment(appt, myRole),
      slotLabel: slotLabel(appt),
      unreadCount: bucket.unread,
      preview: previewText(bucket.latest?.body),
      lastMessageAt: bucket.latest?.created_at || null,
      status: appt.status || null,
    })
  }

  conversations.sort((a, b) => {
    const ta = new Date(a.lastMessageAt || 0).getTime()
    const tb = new Date(b.lastMessageAt || 0).getTime()
    if (tb !== ta) return tb - ta
    return String(a.peerName).localeCompare(String(b.peerName))
  })

  return {
    conversations,
    totalUnread,
    chatConfigured: true,
    readsConfigured: true,
  }
}

export async function listChatInbox({ userId, role }) {
  return buildChatConversationData(userId, role)
}

export async function getChatUnreadSummary({ userId, role }) {
  const { conversations, totalUnread, chatConfigured, readsConfigured } =
    await buildChatConversationData(userId, role)

  const notifications = conversations
    .filter((c) => c.unreadCount > 0)
    .map(({ appointmentId, peerName, slotLabel, unreadCount, preview, lastMessageAt }) => ({
      appointmentId,
      peerName,
      slotLabel,
      unreadCount,
      preview,
      lastMessageAt,
    }))

  return {
    totalUnread,
    notifications,
    chatConfigured,
    readsConfigured,
  }
}

import supabase from '../config/supabase.js'
import {
  resolveChatParticipant,
  getAppointmentChatWindowForRow,
  isConsultEligible,
  isMissingMessagesTable,
  CHAT_SETUP_ERROR,
} from './appointmentChatRows.js'
import { updateAppointmentCompleted } from './appointmentDoctorRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

async function updateAppointmentEndMeta(appointmentId, patch) {
  const attempts = [
    patch,
    { is_completed: true, status: 'completed' },
    { is_completed: true },
    { status: 'completed' },
  ]
  let lastError = null
  for (const attempt of attempts) {
    const { error } = await supabase.from('appointments').update(attempt).eq('id', appointmentId)
    if (!error) return
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  throw lastError || new Error('Could not end appointment')
}

async function insertEndChatMessage(appointmentId, userId, role, body) {
  const { error } = await supabase.from('appointment_messages').insert({
    appointment_id: appointmentId,
    sender_id: userId,
    sender_role: role,
    body,
  })
  if (error) {
    if (isMissingMessagesTable(error)) {
      const e = new Error(CHAT_SETUP_ERROR)
      e.code = 'CHAT_NOT_CONFIGURED'
      throw e
    }
    throw error
  }
}

function displayNameForRole(appointment, role) {
  if (role === 'doctor') return appointment.doc_data?.name || 'Doctor'
  return appointment.user_data?.name || 'Patient'
}

/**
 * End a live confirmed appointment. Doctor ending before slot end must provide reason.
 */
export async function endLiveAppointment(appointmentId, context, { reason } = {}) {
  const { appointment, role, userId } = await resolveChatParticipant(appointmentId, context)

  if (appointment.is_completed || appointment.status === 'completed') {
    const err = new Error('This appointment is already completed')
    err.status = 400
    throw err
  }
  if (!isConsultEligible(appointment)) {
    const err = new Error('Only confirmed appointments can be ended')
    err.status = 400
    throw err
  }

  const window = await getAppointmentChatWindowForRow(appointment)
  const now = new Date()
  const slotStart = window.slotStart ? new Date(window.slotStart) : null
  const slotEnd = slotStart
    ? new Date(slotStart.getTime() + (window.slotDurationMinutes || 60) * 60 * 1000)
    : null

  const liveWindow = window.open
  const started = slotStart && now >= slotStart
  if (!liveWindow && !started) {
    const err = new Error('Appointment has not started yet')
    err.status = 400
    throw err
  }

  const endedEarly = Boolean(slotEnd && now < slotEnd)
  const trimmedReason = String(reason || '').trim()

  if (role === 'doctor' && endedEarly && !trimmedReason) {
    const err = new Error('Please provide a reason for ending the appointment before scheduled time')
    err.status = 400
    err.code = 'REASON_REQUIRED'
    throw err
  }

  const who = displayNameForRole(appointment, role)
  const endedAt = now.toISOString()

  const metaPatch = {
    is_completed: true,
    status: 'completed',
    ended_early: endedEarly,
    early_end_reason: endedEarly ? trimmedReason || null : null,
    ended_at: endedAt,
    ended_by: role,
  }

  try {
    await updateAppointmentEndMeta(appointmentId, metaPatch)
  } catch (err) {
    if (isMissingColumn(err)) {
      await updateAppointmentCompleted(appointmentId)
    } else {
      throw err
    }
  }

  let messageBody
  if (endedEarly && trimmedReason) {
    messageBody = `Appointment ended early by ${who}.\nReason: ${trimmedReason}\n\nThis note is visible to the patient and your care team.`
  } else if (endedEarly) {
    messageBody = `Appointment ended early by ${who}.`
  } else {
    messageBody = `Appointment ended by ${who}. Thank you for your visit.`
  }

  try {
    await insertEndChatMessage(appointmentId, userId, role, messageBody)
  } catch (err) {
    if (err.code !== 'CHAT_NOT_CONFIGURED') throw err
  }

  return {
    appointmentId,
    endedEarly,
    reason: endedEarly ? trimmedReason || null : null,
    endedBy: role,
    endedAt,
    messageBody,
  }
}

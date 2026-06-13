import supabase from '../config/supabase.js'
import { resolveChatParticipant, isMissingMessagesTable, CHAT_SETUP_ERROR } from './appointmentChatRows.js'

export const WEBRTC_SIGNAL_PREFIX = '__WEBRTC_SIGNAL__:'

export function isWebRtcSignalBody(body) {
  return typeof body === 'string' && body.startsWith(WEBRTC_SIGNAL_PREFIX)
}

export async function postWebRtcSignal(appointmentId, context, type, payload) {
  const { role, userId } = await resolveChatParticipant(appointmentId, context)
  const body =
    WEBRTC_SIGNAL_PREFIX +
    JSON.stringify({
      type,
      payload,
      sender_id: userId,
      sender_role: role,
      ts: Date.now(),
    })

  const { data, error } = await supabase
    .from('appointment_messages')
    .insert({
      appointment_id: appointmentId,
      sender_id: userId,
      sender_role: role,
      body,
    })
    .select('id, created_at')
    .single()

  if (error) {
    if (isMissingMessagesTable(error)) {
      const e = new Error(CHAT_SETUP_ERROR)
      e.code = 'CHAT_NOT_CONFIGURED'
      throw e
    }
    throw error
  }

  return {
    id: data.id,
    type,
    payload,
    sender_id: userId,
    sender_role: role,
    created_at: data.created_at,
  }
}

export async function listWebRtcSignals(appointmentId, context, { after } = {}) {
  await resolveChatParticipant(appointmentId, context)

  let query = supabase
    .from('appointment_messages')
    .select('id, body, sender_id, sender_role, created_at')
    .eq('appointment_id', appointmentId)
    .like('body', `${WEBRTC_SIGNAL_PREFIX}%`)
    .order('created_at', { ascending: true })
    .limit(200)

  if (after) {
    query = query.gt('created_at', after)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingMessagesTable(error)) {
      const e = new Error(CHAT_SETUP_ERROR)
      e.code = 'CHAT_NOT_CONFIGURED'
      throw e
    }
    throw error
  }

  const signals = []
  for (const row of data || []) {
    try {
      const parsed = JSON.parse(String(row.body).slice(WEBRTC_SIGNAL_PREFIX.length))
      signals.push({
        id: row.id,
        type: parsed.type,
        payload: parsed.payload,
        sender_id: parsed.sender_id || row.sender_id,
        sender_role: parsed.sender_role || row.sender_role,
        created_at: row.created_at,
      })
    } catch {
      /* skip malformed */
    }
  }
  return signals
}

import {
  getChatSessionForUser,
  listMessages,
  sendMessage,
  getOrCreateVideoRoom,
} from '../utils/appointmentChatRows.js'
import {
  getChatUnreadSummary,
  listChatInbox,
  markAppointmentChatRead,
} from '../utils/appointmentChatNotifyRows.js'

function contextFromReq(req) {
  return { userId: req.consultUser.id, role: req.consultUser.role }
}

export async function getChatSession(req, res) {
  try {
    const { appointmentId } = req.params
    const session = await getChatSessionForUser(appointmentId, contextFromReq(req))
    return res.json({ success: true, session })
  } catch (err) {
    const status = err.status || 400
    return res.status(status).json({ success: false, message: err.message })
  }
}

export async function getChatMessages(req, res) {
  try {
    const { appointmentId } = req.params
    const messages = await listMessages(appointmentId, contextFromReq(req))
    return res.json({ success: true, messages })
  } catch (err) {
    const status = err.status || 400
    return res.status(status).json({ success: false, message: err.message })
  }
}

export async function postChatMessage(req, res) {
  try {
    const { appointmentId } = req.params
    const { body, message } = req.body
    const ctx = contextFromReq(req)
    const row = await sendMessage(appointmentId, ctx, body || message)
    await markAppointmentChatRead(appointmentId, ctx.userId)
    return res.json({ success: true, message: row })
  } catch (err) {
    const status = err.status || 400
    return res.status(status).json({ success: false, message: err.message })
  }
}

export async function getChatUnread(req, res) {
  try {
    const summary = await getChatUnreadSummary({
      userId: req.consultUser.id,
      role: req.consultUser.role,
    })
    return res.json({ success: true, ...summary })
  } catch (err) {
    const status = err.code === 'CHAT_NOT_CONFIGURED' ? 503 : err.status || 500
    return res.status(status).json({ success: false, message: err.message })
  }
}

export async function getChatInbox(req, res) {
  try {
    const inbox = await listChatInbox({
      userId: req.consultUser.id,
      role: req.consultUser.role,
    })
    return res.json({ success: true, ...inbox })
  } catch (err) {
    const status = err.code === 'CHAT_NOT_CONFIGURED' ? 503 : err.status || 500
    return res.status(status).json({ success: false, message: err.message })
  }
}

export async function postChatMarkRead(req, res) {
  try {
    const { appointmentId } = req.params
    await markAppointmentChatRead(appointmentId, req.consultUser.id)
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function postVideoRoom(req, res) {
  try {
    const { appointmentId } = req.params
    const room = await getOrCreateVideoRoom(appointmentId, contextFromReq(req))
    return res.json({ success: true, ...room })
  } catch (err) {
    const status = err.status || 400
    return res.status(status).json({ success: false, message: err.message })
  }
}

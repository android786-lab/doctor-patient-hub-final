import { postWebRtcSignal, listWebRtcSignals } from '../utils/webrtcSignalRows.js'

function contextFromReq(req) {
  return { userId: req.consultUser.id, role: req.consultUser.role }
}

export async function postWebRtcSignalMessage(req, res) {
  try {
    const { appointmentId } = req.params
    const { type, payload } = req.body
    if (!type || !['offer', 'answer', 'ice', 'hangup', 'ready'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid signal type' })
    }
    const signal = await postWebRtcSignal(appointmentId, contextFromReq(req), type, payload || {})
    return res.json({ success: true, signal })
  } catch (err) {
    const status = err.status || 400
    return res.status(status).json({ success: false, message: err.message })
  }
}

export async function getWebRtcSignals(req, res) {
  try {
    const { appointmentId } = req.params
    const after = req.query.after || null
    const signals = await listWebRtcSignals(appointmentId, contextFromReq(req), { after })
    return res.json({ success: true, signals })
  } catch (err) {
    const status = err.status || 400
    return res.status(status).json({ success: false, message: err.message })
  }
}

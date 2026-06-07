import { decodeJwtPayload } from './jwt.js'

export function roleFromToken(token) {
  if (!token) return null
  if (token.split('.').length !== 3) return 'admin'
  const payload = decodeJwtPayload(token)
  if (payload?.role) return payload.role
  if (payload?.id) return 'doctor'
  return 'admin'
}

export function appointmentChatPath(appointmentId, token) {
  const role = roleFromToken(token)
  const base = role === 'assistant' ? '/assistant/appointments' : '/doctor/appointments'
  return `${base}/${appointmentId}/chat`
}

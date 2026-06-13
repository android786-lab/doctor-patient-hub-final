/** Client-side video call helpers */

export const VIDEO_CALL_PREFIX = '🎥 VIDEO_CALL'

export function extractVideoUrlFromMessage(body) {
  if (!body || typeof body !== 'string') return null
  if (!body.includes(VIDEO_CALL_PREFIX)) return null
  const match = body.match(/https?:\/\/[^\s]+/)
  return match ? match[0].replace(/[.,]+$/, '') : null
}

export function isVideoCallMessage(body) {
  return typeof body === 'string' && body.includes(VIDEO_CALL_PREFIX)
}

export function meetingUrlFromSession(session) {
  if (session?.videoProvider === 'webrtc') return null
  if (session?.videoUrl) return session.videoUrl
  return null
}

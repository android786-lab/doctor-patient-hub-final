/** Client-side video call helpers (mirrors backend videoMeeting.js) */

export const VIDEO_CALL_PREFIX = '🎥 VIDEO_CALL'

export function extractVideoUrlFromMessage(body) {
  if (!body || typeof body !== 'string') return null
  if (!body.includes(VIDEO_CALL_PREFIX) && !/meet\.jit\.si|\.daily\.co/i.test(body)) return null
  const match = body.match(/https?:\/\/[^\s]+/)
  return match ? match[0].replace(/[.,]+$/, '') : null
}

export function isVideoCallMessage(body) {
  return !!extractVideoUrlFromMessage(body)
}

export function buildJitsiEmbedUrl(roomId, displayName) {
  const room = encodeURIComponent(roomId)
  const params = [
    'config.prejoinPageEnabled=true',
    'config.enableLobby=false',
    'config.requireDisplayName=false',
    'config.disableDeepLinking=true',
  ]
  if (displayName) {
    params.push(`userInfo.displayName=${encodeURIComponent(displayName)}`)
  }
  return `https://meet.jit.si/${room}#${params.join('&')}`
}

export function meetingUrlFromSession(session) {
  if (session?.videoUrl) return session.videoUrl
  if (session?.videoRoomId) return buildJitsiEmbedUrl(session.videoRoomId)
  return null
}

/**
 * Video meeting URLs — Daily.co (recommended) or Jitsi fallback.
 * Set DAILY_API_KEY on Vercel for rooms that work without moderator login.
 */

export const VIDEO_CALL_PREFIX = '🎥 VIDEO_CALL'

export function normalizeRoomId(appointmentId) {
  return `doctorhub-${String(appointmentId).replace(/-/g, '').slice(0, 16)}`.toLowerCase()
}

export function buildJitsiMeetingUrl(roomId, { displayName } = {}) {
  const room = encodeURIComponent(roomId)
  const params = [
    'config.prejoinPageEnabled=true',
    'config.enableLobby=false',
    'config.requireDisplayName=false',
    'config.disableDeepLinking=true',
    'config.enableWelcomePage=false',
  ]
  if (displayName) {
    params.push(`userInfo.displayName=${encodeURIComponent(displayName)}`)
  }
  return `https://meet.jit.si/${room}#${params.join('&')}`
}

async function fetchDailyRoom(roomName, apiKey) {
  const res = await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return null
  return res.json()
}

async function createDailyRoom(roomName, apiKey) {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60
  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      properties: {
        exp,
        enable_prejoin_ui: true,
        start_video_off: false,
        start_audio_off: false,
        enable_chat: true,
        max_participants: 2,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.info || err.error || `Daily room create failed (${res.status})`)
  }
  return res.json()
}

export async function resolveVideoMeetingUrl(roomId, { displayName } = {}) {
  const dailyKey = process.env.DAILY_API_KEY?.trim()
  if (dailyKey) {
    let room = await fetchDailyRoom(roomId, dailyKey)
    if (!room) room = await createDailyRoom(roomId, dailyKey)
    return {
      provider: 'daily',
      videoUrl: room.url,
      embedUrl: room.url,
      hostHint: null,
    }
  }

  const videoUrl = buildJitsiMeetingUrl(roomId, { displayName })
  return {
    provider: 'jitsi',
    videoUrl,
    embedUrl: videoUrl,
    hostHint:
      'If you see "waiting for moderator", ask your doctor to tap Join video call first (doctors open the room).',
  }
}

export function buildVideoInviteMessage({ senderName, role, videoUrl }) {
  const who = senderName || (role === 'doctor' ? 'Your doctor' : 'Your patient')
  return `${VIDEO_CALL_PREFIX}\n${who} has started the video consultation.\nJoin here: ${videoUrl}`
}

export function extractVideoUrlFromMessage(body) {
  if (!body || typeof body !== 'string') return null
  if (!body.includes(VIDEO_CALL_PREFIX) && !/meet\.jit\.si|\.daily\.co/i.test(body)) return null
  const match = body.match(/https?:\/\/[^\s]+/)
  return match ? match[0].replace(/[.,]+$/, '') : null
}

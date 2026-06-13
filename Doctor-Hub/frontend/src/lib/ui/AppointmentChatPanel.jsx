import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { CHAT_UNAVAILABLE, friendlyUserMessage } from '../../utils/friendlyUserMessage.js'
import {
  extractVideoUrlFromMessage,
  isVideoCallMessage,
  meetingUrlFromSession,
  VIDEO_CALL_PREFIX,
} from './videoCall.js'
import WebRtcVideoCall from './WebRtcVideoCall.jsx'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function isChatSetupError(err) {
  const msg = err?.response?.data?.message || err?.message || ''
  return /appointment_messages|016_appointment_messages|CHAT_NOT_CONFIGURED/i.test(msg)
}

function formatSlotLabel(label) {
  if (!label) return ''
  if (label.includes('T') && label.includes('-')) {
    const d = new Date(label)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }
  }
  return label
}

function VideoEmbed({ url, onClose }) {
  if (!url) return null
  return (
    <div className="border-b border-slate-200 bg-slate-900">
      <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-2">
        <p className="text-xs font-semibold text-white">Live video consultation</p>
        <div className="flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
          >
            Open in tab
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
      <iframe
        title="Video consultation"
        src={url}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="h-[min(420px,55vh)] w-full border-0 bg-black"
      />
    </div>
  )
}

function ChatMessageBubble({ message, mine, onJoinVideo }) {
  const videoUrl = extractVideoUrlFromMessage(message.body)
  const isVideo = isVideoCallMessage(message.body)

  if (isVideo && (videoUrl || true)) {
    const lines = message.body.split('\n').filter(Boolean)
    const headline = lines.find((l) => !l.startsWith('http')) || 'Video call started'
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
            mine
              ? 'rounded-br-md bg-teal-700 text-white'
              : 'rounded-bl-md border border-teal-200 bg-teal-50 text-slate-800'
          }`}
        >
          <p className="font-semibold">{headline.replace(VIDEO_CALL_PREFIX, '').trim() || headline}</p>
          <p className={`mt-1 text-xs ${mine ? 'text-teal-100' : 'text-slate-600'}`}>
            Same link for both — tap below to join together.
          </p>
          <button
            type="button"
            onClick={() => onJoinVideo(videoUrl || 'webrtc')}
            className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              mine
                ? 'bg-white text-teal-800 hover:bg-teal-50'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            Join video call
          </button>
          <p className={`mt-2 text-[10px] ${mine ? 'text-teal-200' : 'text-slate-400'}`}>
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          mine
            ? 'rounded-br-md bg-teal-600 text-white'
            : 'rounded-bl-md bg-slate-100 text-slate-800'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={`mt-1 text-[10px] ${mine ? 'text-teal-100' : 'text-slate-400'}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

/**
 * Shared appointment chat — patient uses token header, doctor uses dtoken (+ token fallback).
 */
export default function AppointmentChatPanel({
  appointmentId,
  backendUrl,
  authHeaders,
  backLink,
  backLabel = '← Back',
}) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoMode, setVideoMode] = useState(null)
  const [setupError, setSetupError] = useState(null)
  const chatScrollRef = useRef(null)
  const lastMessageIdRef = useRef(null)
  const lastVideoNotifyRef = useRef(null)
  const setupToastShown = useRef(false)

  const headers = useCallback(() => authHeaders(), [authHeaders])
  const you = session?.role === 'doctor' ? 'doctor' : 'patient'

  const handleApiError = useCallback((err, { toastOnce = false } = {}) => {
    if (isChatSetupError(err)) {
      setSetupError(CHAT_UNAVAILABLE)
      if (!setupToastShown.current) {
        setupToastShown.current = true
        toast.error(CHAT_UNAVAILABLE)
      }
      return true
    }
    if (!toastOnce) {
      toast.error(friendlyUserMessage(err.response?.data?.message || err.message))
    }
    return false
  }, [])

  const openVideoCall = useCallback((urlOrMode) => {
    if (urlOrMode && urlOrMode !== 'webrtc' && String(urlOrMode).startsWith('http')) {
      setVideoUrl(urlOrMode)
      setVideoMode('daily')
      return
    }
    setVideoMode('webrtc')
  }, [])

  const closeVideoCall = useCallback(() => {
    setVideoMode(null)
  }, [])

  const loadSession = useCallback(async () => {
    const { data } = await axios.get(
      `${backendUrl}/api/appointments/chat/${appointmentId}/session`,
      { headers: headers() }
    )
    if (!data.success) throw new Error(data.message)
    setSession(data.session)
    const url = meetingUrlFromSession(data.session)
    if (url) setVideoUrl(url)
    return data.session
  }, [appointmentId, backendUrl, headers])

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/appointments/chat/${appointmentId}/messages`,
        { headers: headers() }
      )
      if (data.success) {
        setSetupError(null)
        const incoming = data.messages || []
        setMessages((prev) => {
          const prevLast = prev[prev.length - 1]?.id
          const nextLast = incoming[incoming.length - 1]?.id
          if (prev.length === incoming.length && prevLast === nextLast) return prev
          return incoming
        })
      }
    } catch (err) {
      handleApiError(err, { toastOnce: true })
    }
  }, [appointmentId, backendUrl, headers, handleApiError])

  const markRead = useCallback(async () => {
    try {
      await axios.post(
        `${backendUrl}/api/appointments/chat/${appointmentId}/read`,
        {},
        { headers: headers() }
      )
    } catch {
      /* optional */
    }
  }, [appointmentId, backendUrl, headers])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const s = await loadSession()
        const canRead = s?.canReadChat ?? s?.eligible
        if (!cancelled && canRead) {
          await loadMessages()
          await markRead()
        }
      } catch (err) {
        if (!cancelled) handleApiError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [appointmentId, loadSession, loadMessages, handleApiError, markRead])

  useEffect(() => {
    const canSend = session?.canSendChat ?? session?.chatOpen
    if (!canSend || setupError) return undefined
    const id = setInterval(loadMessages, 3000)
    return () => clearInterval(id)
  }, [session?.canSendChat, session?.chatOpen, loadMessages, setupError])

  useEffect(() => {
    if (setupError || !session) return undefined
    const live = session.canSendChat ?? session.chatOpen
    if (live) return undefined
    const id = setInterval(() => {
      loadSession().catch(() => {})
    }, 15000)
    return () => clearInterval(id)
  }, [session, setupError, loadSession])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last?.id || last.id === lastMessageIdRef.current) return
    lastMessageIdRef.current = last.id
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!you || !session) return
    const peerVideo = [...messages]
      .reverse()
      .find((m) => m.sender_role !== you && isVideoCallMessage(m.body))
    if (!peerVideo || peerVideo.id === lastVideoNotifyRef.current) return
    lastVideoNotifyRef.current = peerVideo.id
    const url = extractVideoUrlFromMessage(peerVideo.body)
    toast.info(
      `${session.peerName || 'The other person'} started the video call — tap Join below`,
      {
        autoClose: 10000,
        onClick: () => openVideoCall(url || 'webrtc'),
      }
    )
  }, [messages, you, session, openVideoCall])

  const startVideoCall = async () => {
    setVideoLoading(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/appointments/chat/${appointmentId}/video`,
        {},
        { headers: headers() }
      )
      if (data.success) {
        if (data.provider === 'daily' && data.videoUrl) {
          openVideoCall(data.videoUrl)
        } else {
          openVideoCall('webrtc')
        }
        if (data.inviteMessage) {
          setMessages((prev) => [...prev, data.inviteMessage])
        } else {
          await loadMessages()
        }
        toast.success(
          you === 'doctor'
            ? 'Video started — patient notified in chat. Allow camera when prompted.'
            : 'Video started — doctor notified. Allow camera when prompted.'
        )
      } else {
        toast.error(data.message || 'Could not start video call')
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setVideoLoading(false)
    }
  }

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setSending(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/appointments/chat/${appointmentId}/messages`,
        { body },
        { headers: headers() }
      )
      if (data.success) {
        setText('')
        setMessages((prev) => [...prev, data.message])
        await markRead()
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="dh-chat-shell animate-pulse p-8 text-center text-sm text-slate-500">
        Loading chat…
      </div>
    )
  }

  const canRead = session?.canReadChat ?? session?.eligible
  const canSend = session?.canSendChat ?? session?.chatOpen
  const historyOnly = session?.historyOnly ?? (canRead && !canSend)
  const slotUpcoming =
    historyOnly &&
    session?.window?.reason &&
    /chat opens|not open yet/i.test(session.window.reason)

  const messageList = (
    <div
      ref={chatScrollRef}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-white p-4"
    >
      {messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No messages yet — say hello to start the consultation.
        </p>
      ) : (
        messages.map((m) => (
          <ChatMessageBubble
            key={m.id}
            message={m}
            mine={m.sender_role === you}
            onJoinVideo={openVideoCall}
          />
        ))
      )}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {backLink ? (
        <a href={backLink} className="text-sm font-medium text-teal-700 hover:underline">
          {backLabel}
        </a>
      ) : null}

      {setupError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Chat unavailable</p>
          <p className="mt-2 text-xs leading-relaxed">{setupError}</p>
        </div>
      ) : null}

      <div className="dh-chat-shell flex min-h-[min(520px,calc(100vh-12rem))] flex-col overflow-hidden">
        <div className="dh-chat-header px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">
            Secure consultation
          </p>
          <h1 className="font-display text-lg font-semibold text-white">
            {session?.peerName || 'Consultation'}
          </h1>
          <p className="mt-1 text-xs text-teal-100">
            {session?.slotLabel ? `Slot: ${formatSlotLabel(session.slotLabel)}` : null}
            {session?.status ? ` · ${session.status}` : null}
            {session?.window?.open && session?.window?.windowEnd ? (
              <>
                {' '}
                · open until{' '}
                {new Date(session.window.windowEnd).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            ) : null}
          </p>
        </div>

        {!canRead ? (
          <div className="p-6 text-center text-sm text-slate-600">
            Chat is available after your appointment is <strong>confirmed</strong> by our team.
          </div>
        ) : historyOnly ? (
          <>
            <div
              className={`border-b px-4 py-3 text-sm ${
                slotUpcoming
                  ? 'border-amber-100 bg-amber-50/80 text-amber-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {slotUpcoming ? (
                <>
                  <p className="font-medium">Live chat opens at your slot time</p>
                  <p className="mt-1 text-xs">{session?.window?.reason}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    You can read any messages below. Sending unlocks 5 minutes before your slot.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Appointment slot ended — read-only</p>
                  <p className="mt-1 text-xs">
                    You can still read messages from your visit. New replies are disabled after the
                    slot window.
                  </p>
                </>
              )}
            </div>
            {messageList}
          </>
        ) : (
          <>
            {videoMode === 'webrtc' ? (
              <WebRtcVideoCall
                appointmentId={appointmentId}
                backendUrl={backendUrl}
                authHeaders={authHeaders}
                role={you}
                displayName={session?.peerName}
                onClose={closeVideoCall}
              />
            ) : null}
            {videoMode === 'daily' && videoUrl ? (
              <VideoEmbed url={videoUrl} onClose={closeVideoCall} />
            ) : null}

            {messageList}

            <div className="shrink-0 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">Video consultation</p>
                  <p className="text-[11px] text-slate-500">
                    In-browser video — no Jitsi login. Doctor starts first; patient joins from chat.
                  </p>
                  {you === 'patient' && !videoMode ? (
                    <p className="mt-1 text-[10px] font-medium text-teal-800">
                      Wait for your doctor to start, then tap Join video call.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={startVideoCall}
                    disabled={videoLoading}
                    className="dh-btn px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    {videoLoading
                      ? 'Starting…'
                      : videoMode
                        ? 'Rejoin video'
                        : you === 'doctor'
                          ? 'Start video call'
                          : 'Join video call'}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 p-3">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={sending || !text.trim()}
                  onClick={send}
                  className="dh-btn shrink-0 px-4 py-2 text-sm disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

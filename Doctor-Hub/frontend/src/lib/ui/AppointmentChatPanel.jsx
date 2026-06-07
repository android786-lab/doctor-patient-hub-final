import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

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

function jitsiUrl(roomId) {
  if (!roomId) return null
  return `https://meet.jit.si/${encodeURIComponent(roomId)}`
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
  const [setupError, setSetupError] = useState(null)
  const chatScrollRef = useRef(null)
  const lastMessageIdRef = useRef(null)
  const setupToastShown = useRef(false)

  const headers = useCallback(() => authHeaders(), [authHeaders])

  const handleApiError = useCallback((err, { toastOnce = false } = {}) => {
    if (isChatSetupError(err)) {
      const friendly =
        'Chat database table is missing. Run supabase/016_appointment_messages.sql in Supabase SQL Editor, wait a few seconds, then refresh this page.'
      setSetupError(friendly)
      if (!setupToastShown.current) {
        setupToastShown.current = true
        toast.error(friendly)
      }
      return true
    }
    if (!toastOnce) {
      toast.error(err.response?.data?.message || err.message)
    }
    return false
  }, [])

  const loadSession = useCallback(async () => {
    const { data } = await axios.get(
      `${backendUrl}/api/appointments/chat/${appointmentId}/session`,
      { headers: headers() }
    )
    if (!data.success) throw new Error(data.message)
    setSession(data.session)
    const url = jitsiUrl(data.session?.videoRoomId)
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
    const id = setInterval(loadMessages, 5000)
    return () => clearInterval(id)
  }, [session?.canSendChat, session?.chatOpen, loadMessages, setupError])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last?.id || last.id === lastMessageIdRef.current) return
    lastMessageIdRef.current = last.id
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const startVideoCall = async () => {
    setVideoLoading(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/appointments/chat/${appointmentId}/video`,
        {},
        { headers: headers() }
      )
      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl)
        window.open(data.videoUrl, '_blank', 'noopener,noreferrer')
        toast.success(
          you === 'patient'
            ? 'Video room opened — ask your doctor to tap Join video call too'
            : 'Video room opened — patient can join from the same button'
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

  const copyVideoLink = async () => {
    if (!videoUrl) {
      await startVideoCall()
      return
    }
    try {
      await navigator.clipboard.writeText(videoUrl)
      toast.success('Video link copied — share with the other person')
    } catch {
      toast.info(videoUrl)
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
      <div className="dh-card animate-pulse p-8 text-center text-sm text-slate-500">
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
  const you = session?.role === 'doctor' ? 'doctor' : 'patient'

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
        messages.map((m) => {
          const mine = m.sender_role === you
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? 'rounded-br-md bg-teal-600 text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`mt-1 text-[10px] ${mine ? 'text-teal-100' : 'text-slate-400'}`}
                >
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          )
        })
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
          <p className="font-semibold">Chat setup required (one time)</p>
          <p className="mt-2 text-xs leading-relaxed">{setupError}</p>
          <a
            href="https://supabase.com/dashboard/project/tiwjutktvzwkxxwlwwgb/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-teal-800 underline"
          >
            Open Supabase SQL Editor →
          </a>
        </div>
      ) : null}

      <div className="dh-card flex min-h-[min(520px,calc(100vh-12rem))] flex-col overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Appointment chat
          </p>
          <h1 className="font-display text-lg font-semibold text-slate-900">
            {session?.peerName || 'Consultation'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {session?.slotLabel ? `Slot: ${formatSlotLabel(session.slotLabel)}` : null}
            {session?.status ? ` · ${session.status}` : null}
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
            {messageList}

            <div className="shrink-0 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">Video consultation</p>
                  <p className="text-[11px] text-slate-500">
                    Same room for patient and doctor (Jitsi). Create once, both join.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyVideoLink}
                    disabled={videoLoading}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={startVideoCall}
                    disabled={videoLoading}
                    className="dh-btn px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    {videoLoading ? 'Opening…' : videoUrl ? 'Join video call' : 'Start video call'}
                  </button>
                </div>
              </div>
              {videoUrl ? (
                <p className="truncate px-3 py-1.5 text-[10px] text-slate-500" title={videoUrl}>
                  Room: {videoUrl.replace('https://meet.jit.si/', '')}
                </p>
              ) : null}
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

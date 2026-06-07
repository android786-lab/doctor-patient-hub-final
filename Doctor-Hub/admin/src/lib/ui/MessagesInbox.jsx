import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function chatPathForRole(role, appointmentId) {
  if (role === 'doctor') return `/doctor/appointments/${appointmentId}/chat`
  if (role === 'assistant') return `/assistant/appointments/${appointmentId}/chat`
  return `/patient/appointments/${appointmentId}/chat`
}

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MessagesInbox({
  backendUrl,
  authHeaders,
  role = 'patient',
  title = 'Messages',
  description = 'Chat with your doctor or patient for confirmed appointments.',
}) {
  const [conversations, setConversations] = useState([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!backendUrl) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${backendUrl}/api/appointments/chat/inbox`, {
        headers: authHeaders(),
      })
      if (data.success) {
        setConversations(data.conversations || [])
        setTotalUnread(data.totalUnread ?? 0)
      } else {
        setError(data.message || 'Could not load messages')
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load messages')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [backendUrl, authHeaders])

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="w-full pb-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Inbox</p>
          <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
        </div>
        <button type="button" onClick={load} className="dh-btn-outline py-2 text-sm">
          Refresh
        </button>
      </div>

      {totalUnread > 0 && (
        <p className="mb-4 text-sm text-teal-800">
          <span className="font-semibold">{totalUnread}</span> unread message
          {totalUnread === 1 ? '' : 's'}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/80" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="dh-card px-8 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl">
            💬
          </div>
          <p className="mt-4 font-semibold text-slate-900">No conversations yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Messages open after an appointment is confirmed. Book a visit, then return here to chat
            with your {role === 'patient' ? 'doctor' : 'patient'}.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.appointmentId}>
              <Link
                to={chatPathForRole(role, c.appointmentId)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-lg font-bold text-white">
                  {(c.peerName || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{c.peerName}</p>
                    {c.lastMessageAt && (
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatWhen(c.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {c.slotLabel && (
                    <p className="mt-0.5 text-xs text-slate-500">{c.slotLabel}</p>
                  )}
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {c.preview || 'No messages yet — say hello'}
                  </p>
                </div>
                {c.unreadCount > 0 ? (
                  <span className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-teal-700">Open →</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

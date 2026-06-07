import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useChatNotifications from './useChatNotifications.js'

export default function ChatNotificationBell({
  enabled,
  backendUrl,
  authHeaders,
  role = 'patient',
  className = '',
}) {
  const { totalUnread, notifications, refresh } = useChatNotifications({
    enabled,
    backendUrl,
    authHeaders,
    role,
  })
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!enabled) return null

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) refresh()
        }}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-teal-800"
        title="Messages"
        aria-label={totalUnread ? `${totalUnread} unread messages` : 'Messages'}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {totalUnread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
          <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Messages
          </p>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No new messages</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.appointmentId}>
                  <Link
                    to={n.chatPath}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-teal-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{n.peerName}</p>
                      <span className="shrink-0 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {n.unreadCount}
                      </span>
                    </div>
                    {n.slotLabel ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">{n.slotLabel}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.preview}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

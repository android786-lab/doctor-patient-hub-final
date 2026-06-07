import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const POLL_MS = 12000

function chatPathForRole(role, appointmentId) {
  if (role === 'doctor') {
    return `/doctor/appointments/${appointmentId}/chat`
  }
  if (role === 'assistant') {
    return `/assistant/appointments/${appointmentId}/chat`
  }
  return `/patient/appointments/${appointmentId}/chat`
}

function isOnChatPage(pathname, appointmentId) {
  if (!appointmentId) return false
  return pathname.includes(`/appointments/${appointmentId}/chat`)
}

export default function useChatNotifications({
  enabled,
  backendUrl,
  authHeaders,
  role = 'patient',
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [totalUnread, setTotalUnread] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const seenKeysRef = useRef(new Set())
  const initializedRef = useRef(false)

  const onChatPage = /\/appointments\/[^/]+\/chat/.test(location.pathname)

  const fetchUnread = useCallback(async () => {
    if (!enabled || !backendUrl || onChatPage) return
    setLoading(true)
    try {
      const { data } = await axios.get(`${backendUrl}/api/appointments/chat/unread`, {
        headers: authHeaders(),
      })
      if (!data?.success) return

      const list = data.notifications || []
      setTotalUnread(data.totalUnread ?? 0)
      setNotifications(
        list.map((n) => ({
          ...n,
          chatPath: chatPathForRole(role, n.appointmentId),
        }))
      )

      if (!initializedRef.current) {
        list.forEach((n) => {
          seenKeysRef.current.add(`${n.appointmentId}:${n.lastMessageAt}`)
        })
        initializedRef.current = true
        return
      }

      for (const n of list) {
        const key = `${n.appointmentId}:${n.lastMessageAt}`
        if (seenKeysRef.current.has(key)) continue
        seenKeysRef.current.add(key)
        if (isOnChatPage(location.pathname, n.appointmentId)) continue

        const path = chatPathForRole(role, n.appointmentId)
        toast.info(
          role === 'patient'
            ? `New message from ${n.peerName} — tap to open chat`
            : `New message from ${n.peerName} — tap to reply`,
          {
            autoClose: 8000,
            onClick: () => navigate(path),
          }
        )
        break
      }
    } catch {
      /* optional — chat tables may be missing */
    } finally {
      setLoading(false)
    }
  }, [enabled, backendUrl, authHeaders, role, location.pathname, navigate, onChatPage])

  useEffect(() => {
    if (!enabled) {
      setTotalUnread(0)
      setNotifications([])
      initializedRef.current = false
      seenKeysRef.current = new Set()
      return undefined
    }
    if (onChatPage) return undefined
    fetchUnread()
    const id = setInterval(fetchUnread, POLL_MS)
    return () => clearInterval(id)
  }, [enabled, fetchUnread, onChatPage])

  const markRead = useCallback(
    async (appointmentId) => {
      if (!appointmentId || !backendUrl) return
      try {
        await axios.post(
          `${backendUrl}/api/appointments/chat/${appointmentId}/read`,
          {},
          { headers: authHeaders() }
        )
        await fetchUnread()
      } catch {
        /* ignore */
      }
    },
    [backendUrl, authHeaders, fetchUnread]
  )

  return {
    totalUnread,
    notifications,
    loading,
    refresh: fetchUnread,
    markRead,
    chatPathForRole: (id) => chatPathForRole(role, id),
  }
}

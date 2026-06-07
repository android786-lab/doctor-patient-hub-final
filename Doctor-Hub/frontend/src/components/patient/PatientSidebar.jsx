import { useContext, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { AppContext } from '../../context/AppContext.jsx'
import useChatNotifications from '@doctor-hub/ui/useChatNotifications.js'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? 'bg-teal-600 text-white shadow-md'
      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
  }`

const links = [
  { to: '/patient/dashboard', label: 'Dashboard', end: true },
  { to: '/patient/find-doctors', label: 'Find Doctor' },
  { to: '/patient/appointments', label: 'My Appointments' },
  { to: '/patient/messages', label: 'Messages', showBadge: true },
  { to: '/patient/history', label: 'Medical History' },
  { to: '/patient/prescriptions', label: 'Prescriptions' },
  { to: '/patient/profile', label: 'Profile' },
]

export default function PatientSidebar() {
  const { token, backendUrl } = useContext(AppContext)
  const authHeaders = useMemo(() => () => ({ token }), [token])
  const { totalUnread } = useChatNotifications({
    enabled: Boolean(token),
    backendUrl,
    authHeaders,
    role: 'patient',
  })

  return (
    <aside className="hidden w-full max-w-[240px] shrink-0 lg:block">
      <nav className="sticky top-24 space-y-1 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Patient portal
        </p>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
            <span className="flex-1">{l.label}</span>
            {l.showBadge && totalUnread > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

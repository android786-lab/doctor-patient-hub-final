import { useContext, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { DoctorContext } from '../context/DoctorContext'
import { AdminContext } from '../context/AdminContext'
import BrandLogo from './BrandLogo'
import { roleFromToken } from '../utils/staffRole.js'
import useChatNotifications from '@doctor-hub/ui/useChatNotifications.js'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive
      ? 'bg-teal-600 text-white shadow-md'
      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
  }`

function Icon({ name }) {
  const paths = {
    home: 'M3 12l9-9 9 9M5 10v10h14V10',
    calendar: 'M8 2v4M16 2v4M4 10h16M6 4h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z',
    verify: 'M9 12l2 2 4-4M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
    add: 'M12 5v14M5 12h14',
    people: 'M17 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
    user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
    clinic: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3',
    chat: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
    assistant: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8m8 0a4 4 0 100-8 4 4 0 000 8m5 8v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  }
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  )
}

const doctorLinks = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/doctor/appointments', label: 'Appointments', icon: 'calendar' },
  { to: '/doctor/patients', label: 'Patients', icon: 'people' },
  { to: '/doctor/prescriptions', label: 'Prescriptions', icon: 'verify' },
  { to: '/doctor/profile', label: 'My Profile', icon: 'user' },
  { to: '/doctor/clinics', label: 'Clinics', icon: 'clinic' },
  { to: '/doctor/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/doctor/messages', label: 'Messages', icon: 'chat', showBadge: true },
  { to: '/doctor/assistants', label: 'Assistants', icon: 'assistant' },
]

function staffLinks(role) {
  if (role === 'assistant') {
    return [
      { to: '/assistant/dashboard', label: 'Dashboard', icon: 'home' },
      { to: '/assistant/pending-payments', label: 'Pending payments', icon: 'verify' },
      { to: '/assistant/appointments', label: 'All appointments', icon: 'calendar' },
      { to: '/assistant/bookings', label: 'Bookings', icon: 'calendar' },
      { to: '/assistant/messages', label: 'Messages', icon: 'chat', showBadge: true },
    ]
  }
  const adminCore = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/admin/doctors', label: 'Doctors', icon: 'people' },
    { to: '/admin/patients', label: 'Patients', icon: 'user' },
    { to: '/admin/appointments', label: 'Appointments', icon: 'calendar' },
    { to: '/admin/payments', label: 'Payments', icon: 'verify' },
  ]

  if (role === 'super_admin') {
    return [
      { to: '/superadmin/dashboard', label: 'Dashboard', icon: 'home' },
      ...adminCore.slice(1),
      { to: '/superadmin/admins', label: 'Admins', icon: 'user' },
      { to: '/superadmin/users', label: 'Delete users', icon: 'user' },
      { to: '/verify-payments', label: 'Verify payments', icon: 'verify' },
      { to: '/add-doctor', label: 'Add doctor', icon: 'add' },
      { to: '/add-assistant', label: 'Add assistant', icon: 'add' },
    ]
  }
  return [
    ...adminCore,
    { to: '/verify-payments', label: 'Verify payments', icon: 'verify' },
    { to: '/add-doctor', label: 'Add doctor', icon: 'add' },
    { to: '/add-assistant', label: 'Add assistant', icon: 'add' },
  ]
}

export default function Sidebar() {
  const { dToken, backendUrl: doctorBackend } = useContext(DoctorContext)
  const { aToken, backendUrl: adminBackend } = useContext(AdminContext)
  const role = aToken ? roleFromToken(aToken) : 'doctor'
  const links = aToken ? staffLinks(role) : doctorLinks
  const subtitle =
    role === 'assistant'
      ? 'Assistant'
      : role === 'super_admin'
        ? 'Super Admin'
        : aToken
          ? 'Administration'
          : 'Doctor'

  const backendUrl = doctorBackend || adminBackend
  const chatToken = dToken || (role === 'assistant' ? aToken : null)
  const chatRole = !aToken && dToken ? 'doctor' : role === 'assistant' ? 'assistant' : null

  const authHeaders = useMemo(
    () => () => {
      if (chatRole === 'doctor') return { dtoken: chatToken, token: chatToken }
      if (chatRole === 'assistant') {
        return { atoken: chatToken, token: chatToken, dtoken: chatToken }
      }
      return {}
    },
    [chatToken, chatRole]
  )

  const { totalUnread } = useChatNotifications({
    enabled: Boolean(chatToken && chatRole),
    backendUrl,
    authHeaders,
    role: chatRole || 'doctor',
  })

  if (!aToken && !dToken) return null

  return (
    <aside className="flex min-h-[calc(100vh-4rem)] w-full max-w-[260px] flex-col border-r border-slate-200/80 bg-white/90 p-4 backdrop-blur">
      <div className="mb-6 px-2">
        <BrandLogo subtitle={subtitle} link={false} />
      </div>
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Menu
      </p>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <Icon name={item.icon} />
            <span className="flex-1">{item.label}</span>
            {item.showBadge && totalUnread > 0 && (
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

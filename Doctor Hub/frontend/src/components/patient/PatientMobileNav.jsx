import { NavLink } from 'react-router-dom'

const links = [
  { to: '/patient/dashboard', label: 'Home' },
  { to: '/patient/find-doctors', label: 'Doctors' },
  { to: '/patient/appointments', label: 'Visits' },
  { to: '/patient/messages', label: 'Messages' },
  { to: '/patient/history', label: 'History' },
  { to: '/patient/prescriptions', label: 'Rx' },
]

export default function PatientMobileNav() {
  return (
    <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}

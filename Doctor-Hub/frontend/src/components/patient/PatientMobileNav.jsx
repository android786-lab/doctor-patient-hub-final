import { NavLink } from 'react-router-dom'

const links = [
  { to: '/patient/dashboard', label: 'Home' },
  { to: '/patient/find-doctors', label: 'Doctors' },
  { to: '/patient/appointments', label: 'Visits' },
  { to: '/patient/messages', label: 'Messages' },
  { to: '/patient/history', label: 'History' },
  { to: '/patient/prescriptions', label: 'Rx' },
  { to: '/patient/profile', label: 'Profile' },
]

export default function PatientMobileNav() {
  return (
    <nav
      aria-label="Patient portal"
      className="mb-4 -mx-1 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm lg:hidden"
    >
      <div className="flex gap-1.5 overflow-x-auto scroll-smooth pb-0.5 snap-x snap-mandatory">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `snap-start shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-teal-50'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

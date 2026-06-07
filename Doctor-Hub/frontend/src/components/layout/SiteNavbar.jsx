import { useContext, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AppContext } from '../../context/AppContext.jsx'
import BrandLogo from '../BrandLogo'
import UserAvatar from '../ui/UserAvatar.jsx'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/doctors', label: 'Find Doctors' },
  { to: '/ai-symptom', label: 'AI Check' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

function pickDisplayName(user) {
  const name = (user?.name || user?.full_name || '').trim()
  if (name && !name.includes('@')) return name
  return 'User'
}

function MenuIcon({ d, className = 'text-slate-400' }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function navClass({ isActive }) {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-100'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')
}

export default function SiteNavbar() {
  const { token, userData, user, logout, backendUrl } = useContext(AppContext)
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const displayUser = userData || user
  const displayName = pickDisplayName(displayUser)
  const displayEmail = displayUser?.email || ''

  const closeUserMenu = () => setUserMenuOpen(false)

  const handleLogout = () => {
    setOpen(false)
    closeUserMenu()
    logout()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-teal-100/80 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur-lg">
      <div className="h-1 bg-gradient-to-r from-teal-600 via-teal-500 to-sky-600" />
      <div className="dh-container-wide flex h-14 items-center justify-between gap-3 sm:h-[4.25rem] sm:gap-4">
        <Link to="/" className="shrink-0 no-underline">
          <BrandLogo link={false} />
        </Link>

        <nav className="hidden flex-1 items-center justify-center lg:flex">
          <div className="flex items-center gap-0.5 rounded-xl bg-slate-100/80 p-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
            {token && (
              <NavLink to="/medical-history" className={navClass}>
                History
              </NavLink>
            )}
          </div>
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <a
            href={import.meta.env.VITE_ADMIN_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
          >
            Staff portal
          </a>

          {token ? (
            <div
              className="relative"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <button
                type="button"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className={[
                  'flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-all',
                  userMenuOpen
                    ? 'bg-teal-50 shadow-md ring-2 ring-teal-200/80'
                    : 'bg-slate-50 hover:bg-teal-50/60 hover:shadow-sm ring-1 ring-slate-200/80 hover:ring-teal-200/60',
                ].join(' ')}
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <UserAvatar
                  name={displayName}
                  image={displayUser?.image}
                  className="h-9 w-9 rounded-lg object-cover ring-2 ring-white shadow-sm"
                />
                <span className="max-w-[130px] truncate text-sm font-semibold text-slate-800">
                  {displayName}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-teal-600 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                className={`absolute right-0 top-full z-50 pt-1.5 transition duration-150 ${
                  userMenuOpen
                    ? 'visible translate-y-0 opacity-100'
                    : 'invisible -translate-y-1 opacity-0 pointer-events-none'
                }`}
              >
                <div
                  role="menu"
                  className="w-60 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-300/30"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3.5">
                    <UserAvatar
                      name={displayName}
                      image={displayUser?.image}
                      className="h-11 w-11 rounded-xl object-cover ring-2 ring-white/30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      {displayEmail && (
                        <p className="truncate text-xs text-teal-100">{displayEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-1.5">
                    <Link
                      to="/patient/profile"
                      role="menuitem"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900"
                      onClick={closeUserMenu}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <MenuIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="text-teal-600" />
                      </span>
                      Profile
                    </Link>
                    <Link
                      to="/patient/appointments"
                      role="menuitem"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900"
                      onClick={closeUserMenu}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <MenuIcon
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          className="text-teal-600"
                        />
                      </span>
                      Appointments
                    </Link>
                    <Link
                      to="/medical-history"
                      role="menuitem"
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900"
                      onClick={closeUserMenu}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <MenuIcon
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          className="text-teal-600"
                        />
                      </span>
                      Medical history
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                        <MenuIcon
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          className="text-red-500"
                        />
                      </span>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/auth/login" className="dh-btn px-5 py-2.5 text-sm shadow-sm">
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          Menu
        </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-inner lg:hidden">
          {token && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 p-3 shadow-md">
              <UserAvatar
                name={displayName}
                image={displayUser?.image}
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/40"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{displayName}</p>
                {displayEmail && <p className="truncate text-xs text-teal-100">{displayEmail}</p>}
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {token && (
              <>
                <NavLink
                  to="/medical-history"
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  History
                </NavLink>
                <NavLink
                  to="/patient/profile"
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  Profile
                </NavLink>
                <NavLink
                  to="/patient/appointments"
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  Appointments
                </NavLink>
              </>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {!token && (
              <Link
                to="/auth/login"
                className="dh-btn block text-center text-sm"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
            {token && (
              <button
                type="button"
                className="w-full rounded-xl border border-red-100 bg-red-50 py-2.5 text-sm font-medium text-red-600"
                onClick={handleLogout}
              >
                Logout
              </button>
            )}
            <a
              href={import.meta.env.VITE_ADMIN_URL}
              className="block rounded-xl border border-slate-200 py-2.5 text-center text-sm font-medium text-teal-700"
              target="_blank"
              rel="noreferrer"
            >
              Staff portal
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext'
import { DoctorContext } from '../context/DoctorContext'
import BrandLogo from './BrandLogo'
import axiosClient from '../lib/axiosClient'
import { roleFromToken } from '../utils/staffRole.js'
import { goToPublicLanding } from '../utils/navigation.js'

function staffHomePath(role) {
  if (role === 'assistant') return '/assistant/dashboard'
  if (role === 'super_admin') return '/superadmin/dashboard'
  if (role === 'admin') return '/admin/dashboard'
  return '/doctor/dashboard'
}

function roleLabel(role) {
  if (role === 'assistant') return 'Assistant'
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Administrator'
  return 'Doctor'
}

export default function Navbar({ onMenuClick }) {
  const { aToken, backendUrl } = useContext(AdminContext)
  const { dToken } = useContext(DoctorContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [assignedDoctor, setAssignedDoctor] = useState(null)

  const staffRole = aToken ? roleFromToken(aToken) : null
  const homePath = aToken ? staffHomePath(staffRole) : '/doctor/dashboard'

  useEffect(() => {
    if (staffRole !== 'assistant' || !aToken) {
      setAssignedDoctor(null)
      return
    }

    let cancelled = false
    axiosClient
      .get(`${backendUrl}/api/assistant/me`, {
        headers: { atoken: aToken, token: aToken },
      })
      .then(({ data }) => {
        if (!cancelled && data?.success) setAssignedDoctor(data.assignment?.doctorName)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [staffRole, aToken, backendUrl])

  const logout = () => {
    goToPublicLanding()
  }

  const badge =
    staffRole === 'assistant' && assignedDoctor
      ? `Assistant · Dr. ${assignedDoctor}`
      : roleLabel(staffRole || (aToken ? 'admin' : 'doctor'))

  const isDashboard =
    location.pathname.endsWith('/dashboard') ||
    location.pathname === '/admin-dashboard' ||
    location.pathname === '/doctor-dashboard'

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100 bg-white/95 backdrop-blur">
      <div className="h-1 bg-gradient-to-r from-teal-600 via-teal-500 to-sky-600" />
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button type="button" onClick={() => navigate(homePath)} className="min-w-0 text-left">
            <BrandLogo subtitle="Staff Portal" link={false} />
          </button>

          <span className="hidden max-w-[10rem] truncate rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 sm:inline md:max-w-xs">
            {badge}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isDashboard && (
            <a
              href={import.meta.env.VITE_FRONTEND_URL}
              className="hidden text-sm font-medium text-slate-600 hover:text-teal-700 md:inline"
            >
              Patient website →
            </a>
          )}

          <button type="button" onClick={logout} className="dh-btn dh-btn-compact">
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

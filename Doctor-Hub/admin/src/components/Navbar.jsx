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



export default function Navbar() {

  const { aToken, backendUrl, clearAdminSession } = useContext(AdminContext)

  const { dToken, clearDoctorSession } = useContext(DoctorContext)

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
    clearDoctorSession()
    clearAdminSession()
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

    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">

      <div className="flex items-center justify-between px-4 py-3 sm:px-8">

        <div className="flex items-center gap-4">

          <button type="button" onClick={() => navigate(homePath)} className="text-left">

            <BrandLogo subtitle="Staff Portal" link={false} />

          </button>

          <span className="hidden max-w-xs truncate rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 sm:inline">

            {badge}

          </span>

        </div>



        <div className="flex items-center gap-3">
          {isDashboard && (

            <a

              href={import.meta.env.VITE_FRONTEND_URL}

              className="hidden text-sm font-medium text-slate-600 hover:text-teal-700 sm:inline"

            >

              Patient website →

            </a>

          )}

          <button type="button" onClick={logout} className="dh-btn py-2.5 text-sm">

            Logout

          </button>

        </div>

      </div>

    </header>

  )

}



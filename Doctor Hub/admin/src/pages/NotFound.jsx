import { useContext } from 'react'
import NotFoundPage from '@doctor-hub/ui/NotFoundPage.jsx'
import { AdminContext } from '../context/AdminContext'
import { DoctorContext } from '../context/DoctorContext'
import { roleFromToken } from '../utils/staffRole.js'

export default function NotFound() {
  const { aToken } = useContext(AdminContext)
  const { dToken } = useContext(DoctorContext)
  const role = aToken ? roleFromToken(aToken) : dToken ? 'doctor' : null

  let homeTo = '/'
  let homeLabel = 'Sign in'
  if (role === 'doctor') {
    homeTo = '/doctor/dashboard'
    homeLabel = 'Doctor dashboard'
  } else if (role === 'assistant') {
    homeTo = '/assistant/dashboard'
    homeLabel = 'Assistant dashboard'
  } else if (role === 'super_admin') {
    homeTo = '/superadmin/dashboard'
    homeLabel = 'Super admin'
  } else if (role === 'admin') {
    homeTo = '/admin/dashboard'
    homeLabel = 'Admin dashboard'
  }

  return <NotFoundPage homeTo={homeTo} homeLabel={homeLabel} />
}

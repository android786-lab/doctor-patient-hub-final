import { useContext, useEffect, useState } from 'react'
import { decodeJwtPayload } from './utils/jwt.js'
import { roleFromToken } from './utils/staffRole.js'
import { DoctorContext } from './context/DoctorContext'
import { AdminContext } from './context/AdminContext'
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminAnalyticsDashboard from './pages/Admin/AdminAnalyticsDashboard'
import AdminDoctors from './pages/Admin/AdminDoctors'
import AdminPatients from './pages/Admin/AdminPatients'
import AdminAppointments from './pages/Admin/AdminAppointments'
import AdminPayments from './pages/Admin/AdminPayments'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SuperAdminAdmins from './pages/superadmin/SuperAdminAdmins'
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers'
import RegisterAdmin from './pages/RegisterAdmin'
import AddDoctor from './pages/Admin/AddDoctor'
import AddAssistant from './pages/Admin/AddAssistant'
import VerifyPayments from './pages/Admin/VerifyPayments'
import AssistantHome from './pages/assistant/AssistantHome'
import PendingPayments from './pages/assistant/PendingPayments'
import AssistantAppointments from './pages/assistant/AssistantAppointments'
import AssistantBookings from './pages/assistant/AssistantBookings'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound.jsx'
import AddRecord from './pages/Doctor/AddRecord'
import DoctorDashboard from './pages/Doctor/DoctorDashboard'
import DoctorProfile from './pages/Doctor/DoctorProfile'
import DoctorAppointmentsList from './pages/Doctor/DoctorAppointmentsList'
import DoctorPatients from './pages/Doctor/DoctorPatients'
import PatientHistory from './pages/Doctor/PatientHistory.jsx'
import DoctorClinics from './pages/Doctor/Clinics'
import DoctorSchedule from './pages/Doctor/Schedule'
import DoctorAppointmentChat from './pages/Doctor/AppointmentChat.jsx'
import DoctorMessages from './pages/Doctor/Messages.jsx'
import DoctorAssistants from './pages/Doctor/Assistants.jsx'
import AssistantMessages from './pages/assistant/AssistantMessages.jsx'

function StaffShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="flex">
        <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
        <main className="min-h-[calc(100vh-4rem)] min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function staffHomePath(role) {
  if (role === 'assistant') return '/assistant/dashboard'
  if (role === 'super_admin') return '/superadmin/dashboard'
  return '/admin/dashboard'
}

function assistantGuard(aToken, element) {
  return (
    <ProtectedRoute token={aToken} allowedRoles={['assistant']}>
      {element}
    </ProtectedRoute>
  )
}

function adminGuard(aToken, allowedRoles, element) {
  return (
    <ProtectedRoute token={aToken} allowedRoles={allowedRoles}>
      {element}
    </ProtectedRoute>
  )
}

export default function App() {
  const { dToken, setDToken } = useContext(DoctorContext)
  const { aToken, setAToken } = useContext(AdminContext)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    ;['aToken', 'dToken', 'token'].forEach((key) => {
      const t = localStorage.getItem(key)
      if (t && (t === 'null' || t === 'undefined' || t.split('.').length !== 3)) {
        localStorage.removeItem(key)
      }
    })
  }, [])

  useEffect(() => {
    if (!aToken) return
    if (roleFromToken(aToken) === 'assistant' && aToken !== dToken) {
      localStorage.setItem('dToken', aToken)
      setDToken(aToken)
    }
  }, [aToken, dToken, setDToken])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const authToken = params.get('authToken')
    if (!authToken || authToken.split('.').length !== 3) return

    const payload = decodeJwtPayload(authToken)
    if (payload?.role === 'doctor') {
      localStorage.removeItem('aToken')
      localStorage.setItem('dToken', authToken)
      setDToken(authToken)
      navigate('/doctor/dashboard', { replace: true })
    } else if (['admin', 'super_admin', 'assistant'].includes(payload?.role)) {
      localStorage.setItem('aToken', authToken)
      setAToken(authToken)
      if (payload?.role === 'assistant') {
        localStorage.setItem('dToken', authToken)
        setDToken(authToken)
      } else {
        localStorage.removeItem('dToken')
        setDToken('')
      }
      navigate(staffHomePath(payload.role), { replace: true })
    }
    params.delete('authToken')
    const qs = params.toString()
    window.history.replaceState({}, '', location.pathname + (qs ? `?${qs}` : ''))
  }, [location.search, navigate, setAToken, setDToken])

  const showAdmin = Boolean(aToken)
  const showDoctor = Boolean(dToken) && !showAdmin
  const staffRole = showAdmin ? roleFromToken(aToken) : null
  const isAssistant = staffRole === 'assistant'
  const home = staffHomePath(staffRole)

  if (showAdmin) {
    return (
      <>
        <ToastContainer position="top-right" className="!top-4 !right-4 max-sm:!left-4 max-sm:!right-4" />
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/*"
            element={
              <StaffShell>
                <Routes>
                  {isAssistant ? (
                    <>
                      <Route
                        path="/assistant/dashboard"
                        element={assistantGuard(aToken, <AssistantHome />)}
                      />
                      <Route
                        path="/assistant/pending-payments"
                        element={assistantGuard(aToken, <PendingPayments />)}
                      />
                      <Route
                        path="/assistant/appointments"
                        element={assistantGuard(aToken, <AssistantAppointments />)}
                      />
                      <Route
                        path="/assistant/bookings"
                        element={assistantGuard(aToken, <AssistantBookings />)}
                      />
                      <Route
                        path="/assistant/messages"
                        element={assistantGuard(aToken, <AssistantMessages />)}
                      />
                      <Route
                        path="/assistant/appointments/:appointmentId/chat"
                        element={assistantGuard(aToken, <DoctorAppointmentChat />)}
                      />
                      <Route
                        path="/assistant/verify-payments"
                        element={<Navigate to="/assistant/pending-payments" replace />}
                      />
                      <Route
                        path="/verify-payments"
                        element={<Navigate to="/assistant/pending-payments" replace />}
                      />
                      <Route path="/" element={<Navigate to="/assistant/dashboard" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </>
                  ) : (
                    <>
                      <Route
                        path="/admin/dashboard"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AdminAnalyticsDashboard />)}
                      />
                      <Route
                        path="/superadmin/dashboard"
                        element={adminGuard(aToken, ['super_admin'], <SuperAdminDashboard />)}
                      />
                      <Route
                        path="/admin/doctors"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AdminDoctors />)}
                      />
                      <Route
                        path="/admin/patients"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AdminPatients />)}
                      />
                      <Route
                        path="/admin/appointments"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AdminAppointments />)}
                      />
                      <Route
                        path="/admin/payments"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AdminPayments />)}
                      />
                      <Route
                        path="/superadmin/admins"
                        element={adminGuard(aToken, ['super_admin'], <SuperAdminAdmins />)}
                      />
                      <Route
                        path="/superadmin/users"
                        element={adminGuard(aToken, ['super_admin'], <SuperAdminUsers />)}
                      />
                      <Route path="/admin-dashboard" element={<Navigate to={home} replace />} />
                      <Route
                        path="/verify-payments"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <VerifyPayments />)}
                      />
                      <Route
                        path="/all-appointments"
                        element={<Navigate to="/admin/appointments" replace />}
                      />
                      <Route
                        path="/doctor-list"
                        element={<Navigate to="/admin/doctors" replace />}
                      />
                      <Route
                        path="/add-doctor"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AddDoctor />)}
                      />
                      <Route
                        path="/add-assistant"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <AddAssistant />)}
                      />
                      <Route path="/" element={<Navigate to={home} replace />} />
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                </Routes>
              </StaffShell>
            }
          />
        </Routes>
      </>
    )
  }

  if (showDoctor) {
    return (
      <>
        <ToastContainer position="top-right" className="!top-4 !right-4 max-sm:!left-4 max-sm:!right-4" />
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/*"
            element={
              <StaffShell>
                <Routes>
                  <Route
                    path="/doctor/dashboard"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor-dashboard"
                    element={<Navigate to="/doctor/dashboard" replace />}
                  />
                  <Route
                    path="/doctor/appointments"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorAppointmentsList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/patients"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorPatients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/patients/:patientId/history"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <PatientHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/prescriptions"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <AddRecord />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/profile"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor-appointments"
                    element={<Navigate to="/doctor/prescriptions" replace />}
                  />
                  <Route
                    path="/doctor/clinics"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorClinics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/schedule"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorSchedule />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/messages"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorMessages />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/assistants"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorAssistants />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/appointments/:appointmentId/chat"
                    element={
                      <ProtectedRoute token={dToken} allowedRoles={['doctor']}>
                        <DoctorAppointmentChat />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/doctor-profile" element={<Navigate to="/doctor/profile" replace />} />
                  <Route path="/" element={<Navigate to="/doctor/dashboard" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </StaffShell>
            }
          />
        </Routes>
      </>
    )
  }

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/register-admin" element={<RegisterAdmin />} />
        <Route path="/" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

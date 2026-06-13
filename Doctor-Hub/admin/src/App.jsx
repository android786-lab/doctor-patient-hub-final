import { useContext, useEffect, useState, lazy, Suspense } from 'react'
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
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound.jsx'

const AdminAnalyticsDashboard = lazy(() => import('./pages/Admin/AdminAnalyticsDashboard'))
const AdminDoctors = lazy(() => import('./pages/Admin/AdminDoctors'))
const AdminPatients = lazy(() => import('./pages/Admin/AdminPatients'))
const AdminAppointments = lazy(() => import('./pages/Admin/AdminAppointments'))
const AdminPayments = lazy(() => import('./pages/Admin/AdminPayments'))
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const SuperAdminAdmins = lazy(() => import('./pages/superadmin/SuperAdminAdmins'))
const SuperAdminUsers = lazy(() => import('./pages/superadmin/SuperAdminUsers'))
const RegisterAdmin = lazy(() => import('./pages/RegisterAdmin'))
const AddDoctor = lazy(() => import('./pages/Admin/AddDoctor'))
const AddAssistant = lazy(() => import('./pages/Admin/AddAssistant'))
const StaffProfile = lazy(() => import('./pages/Admin/StaffProfile'))
const VerifyPayments = lazy(() => import('./pages/Admin/VerifyPayments'))
const AssistantHome = lazy(() => import('./pages/assistant/AssistantHome'))
const PendingPayments = lazy(() => import('./pages/assistant/PendingPayments'))
const AssistantAppointments = lazy(() => import('./pages/assistant/AssistantAppointments'))
const AssistantBookings = lazy(() => import('./pages/assistant/AssistantBookings'))
const AddRecord = lazy(() => import('./pages/Doctor/AddRecord'))
const DoctorDashboard = lazy(() => import('./pages/Doctor/DoctorDashboard'))
const DoctorProfile = lazy(() => import('./pages/Doctor/DoctorProfile'))
const DoctorAppointmentsList = lazy(() => import('./pages/Doctor/DoctorAppointmentsList'))
const DoctorPatients = lazy(() => import('./pages/Doctor/DoctorPatients'))
const PatientHistory = lazy(() => import('./pages/Doctor/PatientHistory.jsx'))
const DoctorClinics = lazy(() => import('./pages/Doctor/Clinics'))
const DoctorSchedule = lazy(() => import('./pages/Doctor/Schedule'))
const DoctorAppointmentChat = lazy(() => import('./pages/Doctor/AppointmentChat.jsx'))
const DoctorMessages = lazy(() => import('./pages/Doctor/Messages.jsx'))
const DoctorAssistants = lazy(() => import('./pages/Doctor/Assistants.jsx'))
const AssistantMessages = lazy(() => import('./pages/assistant/AssistantMessages.jsx'))

function StaffPageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
    </div>
  )
}

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
    <div className="dh-staff-shell">
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
          <Suspense fallback={<StaffPageLoader />}>{children}</Suspense>
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
                        path="/assistant/profile"
                        element={assistantGuard(aToken, <StaffProfile />)}
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
                      <Route
                        path="/admin/profile"
                        element={adminGuard(aToken, ['admin', 'super_admin'], <StaffProfile />)}
                      />
                      <Route
                        path="/superadmin/profile"
                        element={adminGuard(aToken, ['super_admin'], <StaffProfile />)}
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
      <Suspense fallback={<StaffPageLoader />}>
      <Routes>
        <Route path="/register-admin" element={<RegisterAdmin />} />
        <Route path="/" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  )
}

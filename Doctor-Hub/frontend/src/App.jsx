import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Navbar from './components/shared/Navbar.jsx'
import Footer from './components/Footer'
import ProtectedRoute from './components/shared/ProtectedRoute.jsx'
import Loader from './components/shared/Loader.jsx'
import { ROLES } from './utils/constants.js'

import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import ResetPassword from './pages/auth/ResetPassword.jsx'
import Home from './pages/Home'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound.jsx'

const PatientDashboard = lazy(() => import('./pages/patient/Dashboard.jsx'))
const FindDoctors = lazy(() => import('./pages/patient/FindDoctors.jsx'))
const DoctorProfile = lazy(() => import('./pages/patient/DoctorProfile.jsx'))
const BookAppointment = lazy(() => import('./pages/patient/BookAppointment.jsx'))
const MyAppointments = lazy(() => import('./pages/patient/MyAppointments.jsx'))
const PatientAppointmentChat = lazy(() => import('./pages/patient/AppointmentChat.jsx'))
const MedicalHistory = lazy(() => import('./pages/patient/MedicalHistory.jsx'))
const PatientMessages = lazy(() => import('./pages/patient/Messages.jsx'))
const Profile = lazy(() => import('./pages/patient/Profile.jsx'))
const Prescriptions = lazy(() => import('./pages/patient/Prescriptions.jsx'))
const Doctors = lazy(() => import('./pages/Doctors'))
const Appointment = lazy(() => import('./Appointment'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const AiSymptom = lazy(() => import('./pages/AiSymptom'))
const Consultation = lazy(() => import('./pages/Consultation'))

import PatientSidebar from './components/patient/PatientSidebar.jsx'
import PatientMobileNav from './components/patient/PatientMobileNav.jsx'

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader />
    </div>
  )
}

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 md:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

function PatientLayout({ children, hideFooter = false, portal = false }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className={`dh-container-wide flex-1 ${hideFooter ? 'py-3 sm:py-4 md:py-6' : 'py-4 sm:py-6 md:py-8'}`}>
        {portal ? (
          <div className="flex w-full gap-5 lg:gap-8">
            <PatientSidebar />
            <div className="min-w-0 w-full flex-1">
              <div className="mb-4 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 to-white px-4 py-3 lg:hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Patient portal</p>
                <p className="text-sm text-slate-600">Manage appointments & medical records</p>
              </div>
              <PatientMobileNav />
              {children}
            </div>
          </div>
        ) : (
          <div className="w-full">{children}</div>
        )}
      </div>
      {!hideFooter ? <Footer /> : null}
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Module 1 — auth */}
        <Route path="/auth/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/auth/register" element={<AuthLayout><Register /></AuthLayout>} />
        <Route path="/auth/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
        <Route path="/auth/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Module 3 — patient dashboard alias */}
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <PatientDashboard />
              </PatientLayout>
            </ProtectedRoute>
          }
        />

        {/* Module 1 — patient (protected) */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <PatientDashboard />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/find-doctors"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <FindDoctors />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/doctors"
          element={<Navigate to="/patient/find-doctors" replace />}
        />
        <Route
          path="/patient/doctor/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <DoctorProfile />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/doctors/:speciality"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <Doctors />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/book/:docId"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <BookAppointment />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/appointments/:appointmentId/chat"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal hideFooter>
                <PatientAppointmentChat />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/appointments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <MyAppointments />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/messages"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <PatientMessages />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/history"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <MedicalHistory />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/profile"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <Profile />
              </PatientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/prescriptions"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <Prescriptions />
              </PatientLayout>
            </ProtectedRoute>
          }
        />

        {/* Public patient pages */}
        <Route
          path="/"
          element={
            <PatientLayout>
              <Home />
            </PatientLayout>
          }
        />
        <Route
          path="/doctors"
          element={
            <PatientLayout>
              <Doctors />
            </PatientLayout>
          }
        />
        <Route
          path="/doctors/:speciality"
          element={
            <PatientLayout>
              <Doctors />
            </PatientLayout>
          }
        />
        <Route
          path="/about"
          element={
            <PatientLayout>
              <About />
            </PatientLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <PatientLayout>
              <Contact />
            </PatientLayout>
          }
        />
        <Route
          path="/ai-symptom"
          element={
            <PatientLayout>
              <AiSymptom />
            </PatientLayout>
          }
        />
        <Route
          path="/appointment/:docId"
          element={
            <PatientLayout>
              <Appointment />
            </PatientLayout>
          }
        />
        <Route
          path="/payment-success"
          element={
            <PatientLayout>
              <PaymentSuccess />
            </PatientLayout>
          }
        />
        <Route
          path="/consultation/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientLayout portal>
                <Consultation />
              </PatientLayout>
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects → Module 1 paths */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/my-profile" element={<Navigate to="/patient/profile" replace />} />
        <Route path="/my-appointments" element={<Navigate to="/patient/appointments" replace />} />
        <Route path="/medical-history" element={<Navigate to="/patient/history" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </div>
  )
}

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/api`
    : 'http://localhost:4000/api')

export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ASSISTANT: 'assistant',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
}

/** Public home — use after logout */
export const LANDING_PATH = '/'

export const ROUTES = {
  LANDING: LANDING_PATH,
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  UNAUTHORIZED: '/unauthorized',
  PATIENT_DASHBOARD: '/patient/dashboard',
  PATIENT_HOME: '/patient',
  FIND_DOCTORS: '/patient/find-doctors',
  DOCTOR_PROFILE: '/patient/doctor',
  BOOK: '/patient/book',
  APPOINTMENTS: '/patient/appointments',
  HISTORY: '/patient/history',
  PRESCRIPTIONS: '/patient/prescriptions',
  PROFILE: '/patient/profile',
}

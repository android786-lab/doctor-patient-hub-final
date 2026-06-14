import axiosClient from '../lib/axiosClient.js'
import { API_BASE_URL } from './constants.js'

function backendBaseUrl() {
  return (
    import.meta.env.VITE_BACKEND_URL ||
    API_BASE_URL.replace(/\/api$/, '')
  ).replace(/\/$/, '')
}

/** Patient site landing — staff logout should return here, not admin login. */
export async function goToPublicLanding() {
  const base = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

  clearStaffStorage()

  try {
    await axiosClient.post(`${backendBaseUrl()}/api/auth/logout`, {}, { timeout: 5000 })
  } catch {
    /* redirect even if network fails — local tokens already cleared */
  }

  window.location.replace(`${base}/`)
}

/** Clear staff session without navigation (e.g. auth errors). */
export function clearStaffStorage() {
  localStorage.removeItem('aToken')
  localStorage.removeItem('dToken')
  localStorage.removeItem('token')
}

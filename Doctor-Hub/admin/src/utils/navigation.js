/** Patient site landing — staff logout should return here, not admin login. */
export function goToPublicLanding() {
  const base = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  // Clear storage synchronously; skip React state updates to avoid a 404 flash on admin routes.
  localStorage.removeItem('aToken')
  localStorage.removeItem('dToken')
  localStorage.removeItem('token')
  window.location.replace(`${base}/`)
}

/** Clear staff session without navigation (e.g. auth errors). */
export function clearStaffStorage() {
  localStorage.removeItem('aToken')
  localStorage.removeItem('dToken')
  localStorage.removeItem('token')
}

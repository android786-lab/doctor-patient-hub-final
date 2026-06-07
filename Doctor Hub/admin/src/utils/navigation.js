/** Patient site landing — staff logout should return here, not admin login. */
export function goToPublicLanding() {
  const base = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  window.location.replace(`${base}/`)
}

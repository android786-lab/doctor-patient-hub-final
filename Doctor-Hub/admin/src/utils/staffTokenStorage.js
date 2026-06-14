import { roleFromToken } from './staffRole.js'

const STAFF_ROLES = new Set(['doctor', 'admin', 'assistant', 'super_admin'])

export function staffDashboardPath(role) {
  if (role === 'doctor') return '/doctor/dashboard'
  if (role === 'assistant') return '/assistant/dashboard'
  if (role === 'super_admin') return '/superadmin/dashboard'
  return '/admin/dashboard'
}

/** Persist JWT for staff portal API headers (aToken / dToken + shared token key). */
export function persistStaffToken(token, { setAToken, setDToken } = {}) {
  if (!token || token.split('.').length !== 3) return null

  const role = roleFromToken(token)
  if (!STAFF_ROLES.has(role)) return null

  localStorage.setItem('token', token)

  if (role === 'doctor') {
    localStorage.removeItem('aToken')
    localStorage.setItem('dToken', token)
    setDToken?.(token)
    setAToken?.('')
    return role
  }

  localStorage.setItem('aToken', token)
  setAToken?.(token)
  if (role === 'assistant') {
    localStorage.setItem('dToken', token)
    setDToken?.(token)
  } else {
    localStorage.removeItem('dToken')
    setDToken?.('')
  }
  return role
}

export function readStoredStaffTokens() {
  const aToken = localStorage.getItem('aToken') || ''
  const dToken = localStorage.getItem('dToken') || ''
  const shared = localStorage.getItem('token') || ''

  const validJwt = (t) => t && t !== 'null' && t !== 'undefined' && t.split('.').length === 3

  let resolvedA = validJwt(aToken) ? aToken : ''
  let resolvedD = validJwt(dToken) ? dToken : ''

  if (!resolvedA && !resolvedD && validJwt(shared)) {
    const role = roleFromToken(shared)
    if (role === 'doctor') resolvedD = shared
    else if (STAFF_ROLES.has(role)) resolvedA = shared
  }

  return { aToken: resolvedA, dToken: resolvedD }
}

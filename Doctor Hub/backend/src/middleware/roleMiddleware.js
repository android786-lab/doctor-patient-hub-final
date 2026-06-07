/** Role-based access control — doc name: roleMiddleware.js */

const ROLE_ALIASES = {
  superadmin: 'super_admin',
  super_admin: 'super_admin',
}

function normalizeRole(role) {
  if (!role) return role
  const key = String(role).toLowerCase().replace(/-/g, '_')
  return ROLE_ALIASES[key] || key
}

/**
 * @param {...string} roles Allowed roles (e.g. 'patient', 'doctor', 'superadmin')
 */
export function roleMiddleware(...roles) {
  const allowed = roles.map(normalizeRole)

  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const userRole = normalizeRole(req.user.role)
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    req.user.role = userRole
    next()
  }
}

/** Alias used in older routes */
export const allowRoles = roleMiddleware

export default roleMiddleware

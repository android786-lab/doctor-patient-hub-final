import { Navigate } from 'react-router-dom'
import { roleFromToken } from '../utils/staffRole.js'

export default function ProtectedRoute({ token, allowedRoles, children, loginPath = '/' }) {
  if (!token) return <Navigate to={loginPath} replace />
  const role = roleFromToken(token)
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import Loader from './Loader.jsx'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

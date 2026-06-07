import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { ROLES } from '../../utils/constants.js'
import { AuthShell, AuthLinks } from '../../components/auth/AuthShell.jsx'

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174'

function redirectAfterLogin(role, navigate) {
  switch (role) {
    case ROLES.PATIENT:
      navigate('/patient/dashboard')
      break
    case ROLES.DOCTOR:
      window.location.href = `${ADMIN_URL}/doctor/dashboard?authToken=${encodeURIComponent(localStorage.getItem('token') || '')}`
      break
    case ROLES.ASSISTANT:
      window.location.href = `${ADMIN_URL}/assistant/dashboard?authToken=${encodeURIComponent(localStorage.getItem('token') || '')}`
      break
    case ROLES.ADMIN:
      window.location.href = `${ADMIN_URL}/admin/dashboard?authToken=${encodeURIComponent(localStorage.getItem('token') || '')}`
      break
    case ROLES.SUPER_ADMIN:
      window.location.href = `${ADMIN_URL}/superadmin/dashboard?authToken=${encodeURIComponent(localStorage.getItem('token') || '')}`
      break
    default:
      navigate('/patient/dashboard')
  }
}

export default function Login() {
  const { token, user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && token && user?.role) {
      redirectAfterLogin(user.role, navigate)
    }
  }, [token, user, isLoading, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      redirectAfterLogin(data.user.role, navigate)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Your health journey starts here"
      subtitle="Sign in with your Doctor Hub account."
    >
      <h2 className="font-display text-2xl font-semibold text-slate-900">Sign in</h2>
      <p className="mt-1 text-sm text-slate-500">
        <Link to="/auth/forgot-password" className="text-teal-700 hover:underline">
          Forgot password?
        </Link>
      </p>

      {successMessage && (
        <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {successMessage}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          required
          type="email"
          placeholder="Email"
          className="dh-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Password"
          minLength={6}
          className="dh-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading} className="dh-btn w-full">
          {loading ? 'Please wait…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/auth/register" className="font-medium text-teal-700">
          Create account
        </Link>
      </p>
      <AuthLinks />
    </AuthShell>
  )
}

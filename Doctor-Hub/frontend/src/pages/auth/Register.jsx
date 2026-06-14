import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { ROLES } from '../../utils/constants.js'
import { AuthShell, AuthLinks } from '../../components/auth/AuthShell.jsx'

const STAFF_REGISTER_DOCTOR_URL = `${
  import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174'
}/register-doctor`

export default function Register() {
  const { token, isLoading, register } = useAuth()
  const navigate = useNavigate()
  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm_password, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && token) navigate('/patient/dashboard')
  }, [token, isLoading, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await register({
        full_name,
        email,
        password,
        role: ROLES.PATIENT,
        phone,
      })
      navigate('/auth/login', {
        state: { message: 'Registered successfully. Please sign in.' },
      })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Join Doctor Hub" subtitle="Create your patient account to book visits and manage care.">
      <h2 className="font-display text-2xl font-semibold text-slate-900">Create account</h2>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          required
          placeholder="Full name"
          className="dh-input"
          value={full_name}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          placeholder="Phone"
          className="dh-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Password (min 6 chars)"
          minLength={6}
          className="dh-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Confirm password"
          minLength={6}
          className="dh-input"
          value={confirm_password}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button type="submit" disabled={loading} className="dh-btn w-full">
          {loading ? 'Please wait…' : 'Register as patient'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Are you a doctor?{' '}
        <a href={STAFF_REGISTER_DOCTOR_URL} className="font-medium text-teal-700 hover:underline">
          Register on the staff portal
        </a>
      </p>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-teal-700">
          Sign in
        </Link>
      </p>
      <AuthLinks />
    </AuthShell>
  )
}

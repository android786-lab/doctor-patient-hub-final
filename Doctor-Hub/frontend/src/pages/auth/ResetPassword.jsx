import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api.js'
import { AuthShell } from '../../components/auth/AuthShell.jsx'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const token =
    searchParams.get('token') ||
    searchParams.get('reset_token') ||
    location.state?.resetToken ||
    ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      setTokenValid(false)
      return
    }
    const check = async () => {
      try {
        const { data } = await api.get('/auth/reset-password/validate', {
          params: { reset_token: token },
        })
        setTokenValid(Boolean(data?.valid))
        if (!data?.valid) setError(data?.message || 'Invalid or expired reset session')
      } catch (e) {
        setTokenValid(false)
        setError(e.response?.data?.message || 'Could not validate reset session')
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [token])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', {
        reset_token: token,
        password,
        confirm_password: confirmPassword,
      })
      setDone(true)
      if (data?.message) {
        setTimeout(() => navigate('/auth/login', { replace: true }), 2500)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      <h2 className="font-display text-2xl font-semibold text-slate-900">Reset password</h2>

      {checking ? (
        <p className="mt-6 text-sm text-slate-500">Validating your session…</p>
      ) : done ? (
        <p className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          Password updated. Redirecting to sign in…
        </p>
      ) : !tokenValid ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || 'This reset session is invalid or has expired.'}
          </p>
          <Link to="/auth/forgot-password" className="text-sm font-semibold text-teal-700 hover:underline">
            Request a new code
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <input
              required
              type="password"
              minLength={6}
              placeholder="New password"
              className="dh-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              required
              type="password"
              minLength={6}
              placeholder="Confirm new password"
              className="dh-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button type="submit" disabled={loading} className="dh-btn w-full">
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm">
        <Link to="/auth/login" className="font-medium text-teal-700">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axiosClient from '../lib/axiosClient'
import BrandLogo from '../components/BrandLogo'
import { API_BASE_URL } from '../utils/constants.js'
import { friendlyUserMessage } from '../utils/friendlyUserMessage.js'

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')

  const token = location.state?.resetToken || ''

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
        const { data } = await axiosClient.get(`${backendUrl}/api/auth/reset-password/validate`, {
          params: { reset_token: token },
        })
        setTokenValid(Boolean(data?.valid))
        if (!data?.valid) setError(data?.message || 'Invalid or expired reset session')
      } catch (e) {
        setTokenValid(false)
        setError(friendlyUserMessage(e.response?.data?.message, 'Could not validate reset session'))
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [token, backendUrl])

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
      await axiosClient.post(`${backendUrl}/api/auth/reset-password`, {
        reset_token: token,
        password,
        confirm_password: confirmPassword,
      })
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 2500)
    } catch (err) {
      setError(friendlyUserMessage(err.response?.data?.message || err.message, 'Reset failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dh-staff-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <BrandLogo link={false} className="justify-center" />
        <h1 className="mt-6 text-center font-display text-2xl font-semibold text-slate-900">
          Set new password
        </h1>

        {checking ? (
          <p className="mt-6 text-center text-sm text-slate-500">Validating your session…</p>
        ) : done ? (
          <p className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Password updated. Redirecting to sign in…
          </p>
        ) : !tokenValid ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error || 'This reset session is invalid or has expired.'}
            </p>
            <Link to="/forgot-password" className="block text-center text-sm font-semibold text-teal-700 hover:underline">
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
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                required
                type="password"
                minLength={6}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
          <Link to="/" className="font-medium text-teal-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

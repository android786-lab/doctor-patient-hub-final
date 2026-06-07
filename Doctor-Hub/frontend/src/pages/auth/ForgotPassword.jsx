import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api.js'
import { AuthShell } from '../../components/auth/AuthShell.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      if (data?.message) setSent(true)
    } catch (err) {
      const status = err.response?.status
      if (status === 404 || /not found/i.test(err.message || '')) {
        setError('No account found with this email')
      } else {
        setError(err.response?.data?.message || err.message || 'Request failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will send a reset link to your email.">
      <h2 className="font-display text-2xl font-semibold text-slate-900">Forgot password</h2>

      {sent ? (
        <div className="mt-6 space-y-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <p>If an account exists for that email, we sent a reset link. Check your inbox and spam folder.</p>
          <p className="text-xs text-teal-700">
            Link expires in 1 hour. Did not receive it? Check your spam folder or try again.
          </p>
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
              type="email"
              placeholder="Your email"
              className="dh-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={loading} className="dh-btn w-full">
              {loading ? 'Sending…' : 'Send reset link'}
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

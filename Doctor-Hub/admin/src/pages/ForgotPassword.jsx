import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../lib/axiosClient'
import BrandLogo from '../components/BrandLogo'
import { API_BASE_URL } from '../utils/constants.js'
import { friendlyUserMessage } from '../utils/friendlyUserMessage.js'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devOtp, setDevOtp] = useState('')

  const onSubmitEmail = async (e) => {
    e.preventDefault()
    setError('')
    setDevOtp('')
    setLoading(true)
    try {
      const { data } = await axiosClient.post(`${backendUrl}/api/auth/forgot-password`, { email })
      if (data?.devOtp) setDevOtp(String(data.devOtp))
      setStep('otp')
    } catch (err) {
      const status = err.response?.status
      const raw = err.response?.data?.message || err.message
      if (status === 404 || /not found/i.test(raw || '')) {
        setError('No account found with this email')
      } else {
        setError(friendlyUserMessage(raw, 'Could not send reset code. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const onSubmitOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axiosClient.post(`${backendUrl}/api/auth/verify-otp`, {
        email,
        otp: otp.trim(),
      })
      navigate('/reset-password', {
        replace: true,
        state: { resetToken: data.reset_token },
      })
    } catch (err) {
      setError(friendlyUserMessage(err.response?.data?.message || err.message, 'Invalid code'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dh-staff-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <BrandLogo link={false} className="justify-center" />
        <h1 className="mt-6 text-center font-display text-2xl font-semibold text-slate-900">
          Reset staff password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          {step === 'email'
            ? 'Works for admin, doctor, and assistant accounts.'
            : 'Enter the 6-digit code sent to your email.'}
        </p>

        {step === 'otp' ? (
          <>
            <p className="mt-4 text-sm text-slate-600">
              Code sent to <span className="font-medium text-slate-800">{email}</span>
            </p>
            {devOtp && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Dev mode — your code: <span className="font-mono font-semibold">{devOtp}</span>
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <form onSubmit={onSubmitOtp} className="mt-6 space-y-4">
              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-digit code"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center font-mono text-lg tracking-[0.35em] focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button type="submit" disabled={loading || otp.length !== 6} className="dh-btn w-full">
                {loading ? 'Verifying…' : 'Verify code'}
              </button>
            </form>
            <button
              type="button"
              className="mt-4 w-full text-sm font-medium text-teal-700 hover:underline"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError('')
                setDevOtp('')
              }}
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <form onSubmit={onSubmitEmail} className="mt-6 space-y-4">
              <input
                required
                type="email"
                placeholder="Staff email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={loading} className="dh-btn w-full">
                {loading ? 'Sending…' : 'Send reset code'}
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

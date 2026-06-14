import { useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import api from '../../services/api.js'

import { AuthShell } from '../../components/auth/AuthShell.jsx'



export default function ForgotPassword() {

  const navigate = useNavigate()

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

      const { data } = await api.post('/auth/forgot-password', { email })

      if (data?.devOtp) setDevOtp(String(data.devOtp))

      setStep('otp')

    } catch (err) {

      const status = err.response?.status

      if (status === 404 || /not found/i.test(err.message || '')) {

        setError('No account found with this email')

      } else if (status === 503) {

        setError(

          err.response?.data?.message ||

            'We could not send the reset email. Please try again later or contact support.'

        )

      } else {

        setError(err.response?.data?.message || err.message || 'Request failed')

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

      const { data } = await api.post('/auth/verify-otp', { email, otp: otp.trim() })

      navigate('/auth/reset-password', {

        replace: true,

        state: { resetToken: data.reset_token },

      })

    } catch (err) {

      setError(err.response?.data?.message || err.message || 'Invalid code')

    } finally {

      setLoading(false)

    }

  }



  return (

    <AuthShell

      title="Reset your password"

      subtitle={step === 'email' ? 'Works for patients, doctors, admins, and assistants.' : 'Enter the code we sent to your email.'}

    >

      <h2 className="font-display text-2xl font-semibold text-slate-900">Forgot password</h2>



      {step === 'otp' ? (

        <>

          <p className="mt-4 text-sm text-slate-600">

            Code sent to <span className="font-medium text-slate-800">{email}</span>. Expires in 10 minutes.

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

              className="dh-input text-center font-mono text-lg tracking-[0.35em]"

              value={otp}

              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}

            />

            <button type="submit" disabled={loading || otp.length !== 6} className="dh-btn w-full">

              {loading ? 'Verifying…' : 'Verify code'}

            </button>

          </form>

          <button

            type="button"

            className="mt-4 text-sm font-medium text-teal-700 hover:underline"

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

              placeholder="Your email"

              className="dh-input"

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

        <Link to="/auth/login" className="font-medium text-teal-700">

          Back to sign in

        </Link>

      </p>

    </AuthShell>

  )

}


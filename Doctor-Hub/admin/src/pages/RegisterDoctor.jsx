import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../lib/axiosClient'
import BrandLogo from '../components/BrandLogo'
import { API_BASE_URL } from '../utils/constants.js'

const SUCCESS_MSG =
  'Your doctor account is ready. Sign in with the Doctor tab using your email and password. A hospital admin may need to verify your profile before patients can book with you.'

export default function RegisterDoctor() {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { data } = await axiosClient.post(`${backendUrl}/api/auth/register`, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        role: 'doctor',
      })
      setSubmitted(true)
      toast.success(data.message || 'Registered successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 p-10 text-white lg:flex">
        <BrandLogo subtitle="Doctor onboarding" light />
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Join Doctor Hub as a doctor
          </h1>
          <p className="mt-4 max-w-md text-sm text-teal-100/90">
            Create your staff account on the doctor portal. After sign-in you can set up your profile,
            clinics, schedule, and manage appointments.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-teal-50">
            <li>✓ Manage your calendar &amp; clinics</li>
            <li>✓ Chat with patients during visits</li>
            <li>✓ Prescriptions &amp; medical records</li>
          </ul>
        </div>
        <p className="text-xs text-teal-300">Staff portal · Port 5174</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <BrandLogo subtitle="Doctor registration" />
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-xl text-white">
                ✓
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold text-slate-900">
                Account created
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{SUCCESS_MSG}</p>
              <Link
                to="/"
                state={{ tab: 'Doctor' }}
                className="dh-btn mt-6 inline-block w-full text-center"
              >
                Sign in as Doctor
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="dh-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-slate-900">Doctor registration</h2>
              <p className="mt-1 text-xs text-slate-500">
                Use the same email and password to sign in on the Doctor tab after registering.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Full name</label>
                  <input
                    required
                    minLength={2}
                    className="dh-input mt-1 w-full"
                    value={form.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="dh-input mt-1 w-full"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <input
                    type="tel"
                    required
                    minLength={7}
                    placeholder="03XX XXXXXXX"
                    className="dh-input mt-1 w-full"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="dh-input mt-1 w-full"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="dh-input mt-1 w-full"
                    value={form.confirm_password}
                    onChange={(e) => update('confirm_password', e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="dh-btn mt-6 w-full">
                {loading ? 'Creating account…' : 'Create doctor account'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link to="/" state={{ tab: 'Doctor' }} className="font-semibold text-teal-700 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-slate-500">
            Hospital admin?{' '}
            <Link to="/register-admin" className="font-medium text-teal-700 hover:underline">
              Admin registration
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

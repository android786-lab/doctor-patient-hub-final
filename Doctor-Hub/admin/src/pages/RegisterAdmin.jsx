import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../lib/axiosClient'
import BrandLogo from '../components/BrandLogo'
import { API_BASE_URL } from '../utils/constants.js'

const SUCCESS_MSG =
  'Your registration request has been sent to the super admin for approval. You will be notified once approved — then sign in here with your email and password.'

export default function RegisterAdmin() {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    organization_name: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [setupHint, setSetupHint] = useState(false)

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axiosClient.post(`${backendUrl}/api/auth/register-admin`, form)
      setSubmitted(true)
      toast.success(data.message || SUCCESS_MSG)
    } catch (err) {
      const msg = err.message || 'Registration failed'
      if (/table missing|017_admin_registration/i.test(msg)) setSetupHint(true)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    if (!form.email.trim()) {
      toast.error('Enter your email first')
      return
    }
    setChecking(true)
    try {
      const { data } = await axiosClient.get(
        `${backendUrl}/api/auth/admin-registration/status`,
        { params: { email: form.email.trim() } }
      )
      if (data.status === 'approved') {
        toast.success('Approved! You can sign in now.')
      } else if (data.status === 'pending') {
        toast.info(data.message || 'Still pending super admin approval.')
      } else if (data.status === 'rejected') {
        toast.error(data.message || 'Request was rejected.')
      } else {
        toast.info('No registration found for this email.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 via-teal-900 to-slate-800 p-10 text-white lg:flex">
        <BrandLogo subtitle="Admin onboarding" light />
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Become a Doctor Hub admin
          </h1>
          <p className="mt-4 max-w-md text-sm text-teal-100/90">
            Register your organization. The super admin will review your request and contact you on
            the phone number you provide before granting access.
          </p>
        </div>
        <p className="text-xs text-teal-300">Approval required · Secure staff portal</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <BrandLogo subtitle="Admin registration" />
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-xl text-white">
                ✓
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold text-slate-900">
                Request submitted
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{SUCCESS_MSG}</p>
              <button
                type="button"
                onClick={checkStatus}
                disabled={checking}
                className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
              >
                {checking ? 'Checking…' : 'Check approval status'}
              </button>
              <Link to="/" className="dh-btn mt-6 inline-block w-full text-center">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="dh-card p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-slate-900">Admin registration</h2>
              <p className="mt-1 text-xs text-slate-500">
                All fields marked below are required unless noted.
              </p>

              {setupHint && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Registration temporarily unavailable</p>
                  <p className="mt-2 text-xs leading-relaxed">
                    We could not submit your request right now. Please try again later or contact
                    hospital support.
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Full name</label>
                  <input
                    required
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
                    className="dh-input mt-1 w-full"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Contact number</label>
                  <input
                    type="tel"
                    required
                    placeholder="03XX XXXXXXX"
                    className="dh-input mt-1 w-full"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Super admin may call this number before approval.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="dh-input mt-1 w-full"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Organization / clinic name <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    className="dh-input mt-1 w-full"
                    value={form.organization_name}
                    onChange={(e) => update('organization_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Note for super admin <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    className="dh-input mt-1 w-full"
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="dh-btn mt-6 w-full">
                {loading ? 'Submitting…' : 'Register for approval'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Already approved?{' '}
            <Link to="/" className="font-semibold text-teal-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

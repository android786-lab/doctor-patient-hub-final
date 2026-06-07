import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { roleFromToken } from '../../utils/staffRole.js'

export default function AddAssistant() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const role = roleFromToken(aToken)
  const isSuperAdmin = role === 'super_admin'

  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    doctorId: '',
  })
  const [loading, setLoading] = useState(false)

  const headers = { atoken: aToken, token: aToken }

  useEffect(() => {
    if (!aToken) return
    const load = async () => {
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/admin/doctors`, { headers })
        setDoctors(data.doctors || [])
      } catch (e) {
        toast.error(e.message)
      }
    }
    load()
  }, [aToken, backendUrl])

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
      const body = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      }
      if (form.doctorId) body.doctorId = form.doctorId

      const { data } = await axiosClient.post(`${backendUrl}/api/admin/assistants`, body, {
        headers,
      })
      toast.success(data.message || 'Assistant created')
      setForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
        doctorId: '',
      })
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Staff"
        title="Add assistant"
        description="Create a dedicated assistant account. They sign in at the admin portal with role assistant."
      />

      <form onSubmit={onSubmit} className="dh-card mt-6 max-w-lg space-y-4 p-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            required
            className="dh-input mt-1 w-full"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            required
            type="email"
            className="dh-input mt-1 w-full"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Phone (WhatsApp)</label>
          <input
            required
            className="dh-input mt-1 w-full"
            placeholder="+923001234567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">Used for appointment notifications if configured.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            required
            type="password"
            minLength={6}
            className="dh-input mt-1 w-full"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Confirm password</label>
          <input
            required
            type="password"
            minLength={6}
            className="dh-input mt-1 w-full"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Assign to doctor {isSuperAdmin ? '(optional now)' : ''}
          </label>
          <select
            className="dh-input mt-1 w-full"
            value={form.doctorId}
            onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
          >
            <option value="">— Select later —</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {isSuperAdmin && (
            <p className="mt-1 text-xs text-slate-500">
              Super admin can also assign from Dashboard → Assign tab.
            </p>
          )}
        </div>
        <button type="submit" disabled={loading} className="dh-btn w-full">
          {loading ? 'Creating…' : 'Create assistant account'}
        </button>
      </form>
    </div>
  )
}

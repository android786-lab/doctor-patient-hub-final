import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'

export default function SuperAdminAdmins() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [admins, setAdmins] = useState([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const headers = { atoken: aToken, token: aToken }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/superadmin/admins`, { headers })
      if (data.success) setAdmins(data.admins || [])
      else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const promote = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      const { data } = await axiosClient.post(
        `${backendUrl}/api/superadmin/admins`,
        { email: email.trim() },
        { headers }
      )
      if (data.success) {
        toast.success(data.message)
        setEmail('')
        load()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const demote = async (userId) => {
    if (!window.confirm('Demote this admin to patient role?')) return
    setBusy(true)
    try {
      const { data } = await axiosClient.patch(
        `${backendUrl}/api/superadmin/admins/demote`,
        { userId },
        { headers }
      )
      if (data.success) {
        toast.success(data.message)
        load()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Super Admin"
        title="Admin management"
        description="Promote users to admin or demote admins (not super admins)."
      />

      <form onSubmit={promote} className="mb-8 flex flex-wrap gap-2">
        <input
          type="email"
          className="dh-input min-w-[240px] flex-1"
          placeholder="User email to promote"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={busy} className="dh-btn">
          Promote to admin
        </button>
      </form>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.email}</td>
                  <td className="px-4 py-3 capitalize">{a.role?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right">
                    {a.role === 'admin' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => demote(a.id)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Demote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

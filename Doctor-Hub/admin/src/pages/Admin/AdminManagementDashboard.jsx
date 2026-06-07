import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { roleFromToken } from '../../utils/staffRole.js'

export default function AdminManagementDashboard({ embedded = false }) {
  const { aToken, backendUrl } = useContext(AdminContext)
  const role = roleFromToken(aToken)
  const isSuperAdmin = role === 'super_admin'

  const [tab, setTab] = useState('doctors')
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [users, setUsers] = useState([])
  const [assignOpts, setAssignOpts] = useState({ doctors: [], assistants: [] })
  const [assignDoctor, setAssignDoctor] = useState('')
  const [assignAssistant, setAssignAssistant] = useState('')
  const [loading, setLoading] = useState(true)

  const headers = { atoken: aToken, token: aToken }

  const load = async () => {
    setLoading(true)
    try {
      const [docRes, patRes] = await Promise.all([
        axiosClient.get(`${backendUrl}/api/admin/doctors`, { headers }),
        axiosClient.get(`${backendUrl}/api/admin/patients`, { headers }),
      ])
      setDoctors(docRes.data.doctors || [])
      setPatients(patRes.data.patients || [])

      const roleRequests = [
        axiosClient.get(`${backendUrl}/api/admin/users`, { headers }),
      ]
      if (isSuperAdmin) {
        roleRequests.push(
          axiosClient.get(`${backendUrl}/api/admin/assign-options`, { headers })
        )
      }
      const roleResults = await Promise.all(roleRequests)
      setUsers(roleResults[0].data.users || [])
      if (isSuperAdmin && roleResults[1]) {
        setAssignOpts(roleResults[1].data || { doctors: [], assistants: [] })
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const verifyDoctor = async (id) => {
    try {
      await axiosClient.patch(`${backendUrl}/api/admin/doctors/${id}/verify`, {}, { headers })
      toast.success('Doctor verified')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const deactivate = async (id) => {
    try {
      await axiosClient.patch(`${backendUrl}/api/admin/users/${id}/deactivate`, {}, { headers })
      toast.success('Account deactivated')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const changeRole = async (userId, newRole) => {
    try {
      await axiosClient.patch(
        `${backendUrl}/api/admin/users/${userId}/role`,
        { newRole },
        { headers }
      )
      toast.success('Role updated')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const assign = async () => {
    if (!assignDoctor || !assignAssistant) {
      toast.error('Select doctor and assistant')
      return
    }
    try {
      await axiosClient.patch(
        `${backendUrl}/api/admin/assistants/assign`,
        { doctorId: assignDoctor, assistantUserId: assignAssistant },
        { headers }
      )
      toast.success('Assistant assigned')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const tabs = isSuperAdmin
    ? ['doctors', 'users', 'assign', 'roles']
    : ['doctors', 'users', 'roles']

  return (
    <div className={embedded ? '' : 'p-4 sm:p-6 lg:p-8'}>
      {!embedded && (
        <PageHeader
          eyebrow={isSuperAdmin ? 'Super Admin' : 'Administration'}
          title={isSuperAdmin ? 'Super admin dashboard' : 'Admin dashboard'}
          description="Manage doctors, patients, and platform access."
        />
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {t === 'users' ? 'Patients' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
      ) : tab === 'doctors' ? (
        <div className="space-y-3">
          {doctors.map((d) => (
            <div
              key={d.id}
              className={`dh-card flex flex-wrap items-center justify-between gap-4 p-4 ${
                !d.is_verified ? 'border-amber-300 bg-amber-50/40' : ''
              }`}
            >
              <div>
                <p className="font-semibold text-slate-900">{d.name}</p>
                <p className="text-sm text-slate-500">{d.email}</p>
                {!d.is_verified && (
                  <span className="mt-1 inline-block rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    Unverified
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!d.is_verified && (
                  <button type="button" onClick={() => verifyDoctor(d.id)} className="dh-btn py-2 text-sm">
                    Verify doctor
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deactivate(d.id)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-3">
          {patients.map((p) => (
            <div key={p.id} className="dh-card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500">{p.email}</p>
                <p className="text-xs text-slate-400">
                  Joined {p.joined_at ? new Date(p.joined_at).toLocaleDateString() : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deactivate(p.id)}
                className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Deactivate
              </button>
            </div>
          ))}
        </div>
      ) : tab === 'assign' && isSuperAdmin ? (
        <div className="dh-card max-w-lg space-y-4 p-6">
          <h3 className="font-semibold text-slate-900">Assign assistant to doctor</h3>
          <select
            className="dh-input w-full"
            value={assignDoctor}
            onChange={(e) => setAssignDoctor(e.target.value)}
          >
            <option value="">Select doctor</option>
            {assignOpts.doctors?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="dh-input w-full"
            value={assignAssistant}
            onChange={(e) => setAssignAssistant(e.target.value)}
          >
            <option value="">Select assistant</option>
            {assignOpts.assistants?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.email}
              </option>
            ))}
          </select>
          <button type="button" onClick={assign} className="dh-btn">
            Assign
          </button>
        </div>
      ) : tab === 'roles' ? (
        <div className="space-y-3">
          {!isSuperAdmin && (
            <p className="rounded-lg border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
              You can promote patients to <strong>assistant</strong> only. Other roles are managed by
              super admin.
            </p>
          )}
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">No users available for role assignment.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="dh-card flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{u.name || u.email}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  <p className="mt-0.5 text-xs capitalize text-slate-400">Current: {u.role || 'patient'}</p>
                </div>
                {isSuperAdmin ? (
                  u.is_doctor || u.role === 'doctor' ? (
                    <span className="rounded-lg bg-sky-100 px-3 py-2 text-sm font-semibold text-sky-900">
                      doctor
                    </span>
                  ) : (
                    <select
                      className="dh-input max-w-[200px] py-2 text-sm"
                      value={u.role || 'patient'}
                      disabled={u.role === 'super_admin'}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      {['patient', 'doctor', 'assistant', 'admin', 'super_admin'].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <select
                    className="dh-input max-w-[200px] py-2 text-sm"
                    value={u.role === 'assistant' ? 'assistant' : 'patient'}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                  >
                    <option value="patient">patient</option>
                    <option value="assistant">assistant</option>
                  </select>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

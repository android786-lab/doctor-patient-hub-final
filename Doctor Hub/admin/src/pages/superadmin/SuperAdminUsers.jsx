import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import ConfirmModal from '@doctor-hub/ui/ConfirmModal.jsx'
import Loader from '../../components/shared/Loader.jsx'

export default function SuperAdminUsers() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const headers = { atoken: aToken, token: aToken }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/admin/users`, { headers })
      setUsers(data.users || [])
    } catch (e) {
      toast.error(e.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const confirmDelete = async () => {
    const user = deleteTarget
    if (!user) return
    setBusyId(user.id)
    try {
      const { data } = await axiosClient.delete(`${backendUrl}/api/superadmin/users/${user.id}`, {
        headers,
      })
      if (data.success) {
        toast.success(data.message)
        setDeleteTarget(null)
        load()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Super Admin"
        title="User deletion"
        description="Remove users from the platform. Accounts with medical history cannot be hard-deleted."
      />

      {loading ? (
        <Loader />
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
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'super_admin' && (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => setDeleteTarget(u)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete user?"
        message={
          deleteTarget
            ? `Permanently delete ${deleteTarget.email}? Medical history rows are never removed from the database.`
            : ''
        }
        confirmLabel="Delete user"
        tone="danger"
        busy={!!busyId}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

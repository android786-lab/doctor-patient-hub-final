import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'

export default function AdminPatients() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  const headers = { atoken: aToken, token: aToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/admin/patients`, { headers })
        setPatients(data.patients || [])
      } catch (e) {
        toast.error(e.message)
        setPatients([])
      } finally {
        setLoading(false)
      }
    }
    if (aToken) load()
  }, [aToken, backendUrl])

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Administration"
        title="Patients"
        description="All registered patients on the platform."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.joined_at ? new Date(p.joined_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.is_active !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.is_active !== false ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {patients.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No patients found.</p>
          )}
        </div>
      )}
    </div>
  )
}

import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'

export default function AdminDoctors() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const headers = { atoken: aToken, token: aToken }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/admin/doctors`, { headers })
      setDoctors(data.doctors || [])
    } catch (e) {
      toast.error(e.message)
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const toggleVerify = async (doc, verify) => {
    setBusyId(doc.id)
    try {
      const path = verify ? 'verify' : 'unverify'
      const { data } = await axiosClient.put(
        `${backendUrl}/api/admin/doctors/${doc.id}/${path}`,
        {},
        { headers }
      )
      if (data.success) {
        toast.success(data.message)
        load()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Administration"
        title="Doctors"
        description="Verify doctors before they appear to patients."
      >
        <button type="button" onClick={load} className="dh-btn py-2 text-sm">
          Refresh
        </button>
      </PageHeader>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{doc.name}</td>
                  <td className="px-4 py-3 text-slate-600">{doc.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{doc.specialization || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        doc.is_verified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {doc.is_verified ? (
                      <button
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => toggleVerify(doc, false)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Unverify
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => toggleVerify(doc, true)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {doctors.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No doctors found.</p>
          )}
        </div>
      )}
    </div>
  )
}

import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import ClinicalDataList from '@doctor-hub/ui/ClinicalDataList.jsx'

function VerifyBadge({ verified }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {verified ? 'Verified' : 'Unverified'}
    </span>
  )
}

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

  const renderActions = (doc) =>
    doc.is_verified ? (
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
    )

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name', render: (doc) => <span className="font-medium text-slate-900">{doc.name}</span> },
      { key: 'email', label: 'Email', render: (doc) => doc.email || '—' },
      { key: 'specialization', label: 'Specialization', render: (doc) => doc.specialization || '—' },
      {
        key: 'status',
        label: 'Status',
        render: (doc) => <VerifyBadge verified={doc.is_verified} />,
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right',
        render: (doc) => renderActions(doc),
      },
    ],
    [busyId]
  )

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
        <ClinicalDataList
          columns={columns}
          rows={doctors}
          emptyMessage="No doctors found."
          mobileCard={(doc) => (
            <article className="dh-portal-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{doc.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{doc.email || '—'}</p>
                </div>
                <VerifyBadge verified={doc.is_verified} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{doc.specialization || '—'}</p>
              <div className="mt-4 border-t border-slate-100 pt-3">{renderActions(doc)}</div>
            </article>
          )}
        />
      )}
    </div>
  )
}

import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import ClinicalDataList from '@doctor-hub/ui/ClinicalDataList.jsx'

function ActiveBadge({ active }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {active ? 'Yes' : 'No'}
    </span>
  )
}

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

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Name', render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
      { key: 'email', label: 'Email', render: (p) => p.email || '—' },
      {
        key: 'joined_at',
        label: 'Joined',
        render: (p) => (p.joined_at ? new Date(p.joined_at).toLocaleDateString() : '—'),
      },
      {
        key: 'is_active',
        label: 'Active',
        render: (p) => <ActiveBadge active={p.is_active !== false} />,
      },
    ],
    []
  )

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Administration"
        title="Patients"
        description="All registered patients on the platform."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <ClinicalDataList
          columns={columns}
          rows={patients}
          emptyMessage="No patients found."
          mobileCard={(p) => (
            <article className="dh-portal-panel p-4">
              <p className="font-semibold text-slate-900">{p.name}</p>
              <p className="mt-1 text-sm text-slate-600">{p.email || '—'}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-600">
                  Joined {p.joined_at ? new Date(p.joined_at).toLocaleDateString() : '—'}
                </span>
                <ActiveBadge active={p.is_active !== false} />
              </div>
            </article>
          )}
        />
      )}
    </div>
  )
}

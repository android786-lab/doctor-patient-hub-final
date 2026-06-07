import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import ClinicalDataList from '@doctor-hub/ui/ClinicalDataList.jsx'
import { formatMoney } from '@doctor-hub/constants/currency.js'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'awaiting_verification', label: 'Awaiting verification' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function ApptStatus({ item }) {
  const status = item.cancelled ? 'cancelled' : item.status || 'pending'
  const tones = {
    confirmed: 'bg-teal-100 text-teal-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
    awaiting_verification: 'bg-amber-100 text-amber-800',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[status] || 'bg-slate-100 text-slate-700'}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function AdminAppointments() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')

  const headers = { atoken: aToken, token: aToken }

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (status) params.status = status
      if (date) params.date = date
      const { data } = await axiosClient.get(`${backendUrl}/api/admin/appointments`, {
        headers,
        params,
      })
      if (data.success) setList(data.appointments || [])
      else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const columns = useMemo(
    () => [
      {
        key: 'patient',
        label: 'Patient',
        render: (a) => <span className="font-medium text-slate-900">{a.user_data?.name || 'Patient'}</span>,
      },
      { key: 'doctor', label: 'Doctor', render: (a) => a.doc_data?.name || 'Doctor' },
      {
        key: 'when',
        label: 'When',
        render: (a) => `${a.slot_date} ${a.slot_time}`,
      },
      { key: 'amount', label: 'Amount', render: (a) => formatMoney(a.amount ?? 0) },
      { key: 'status', label: 'Status', render: (a) => <ApptStatus item={a} /> },
    ],
    []
  )

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Administration"
        title="Appointments"
        description="All platform appointments — filter by status or date."
      >
        <button type="button" onClick={load} className="dh-btn py-2 text-sm">
          Apply filters
        </button>
      </PageHeader>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          className="dh-input w-full min-w-0 sm:w-auto sm:min-w-[160px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="dh-input w-full sm:w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <ClinicalDataList
          columns={columns}
          rows={list}
          emptyMessage="No appointments match filters."
          mobileCard={(a) => (
            <article className="dh-portal-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{a.user_data?.name || 'Patient'}</p>
                  <p className="mt-0.5 text-sm text-teal-700">Dr. {a.doc_data?.name || 'Doctor'}</p>
                </div>
                <ApptStatus item={a} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <span>
                  {a.slot_date} {a.slot_time}
                </span>
                <span className="font-semibold text-slate-900">{formatMoney(a.amount ?? 0)}</span>
              </div>
            </article>
          )}
        />
      )}
    </div>
  )
}

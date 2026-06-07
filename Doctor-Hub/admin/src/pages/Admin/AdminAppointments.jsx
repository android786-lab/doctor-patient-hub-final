import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {a.user_data?.name || 'Patient'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.doc_data?.name || 'Doctor'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.slot_date} {a.slot_time}
                  </td>
                  <td className="px-4 py-3">{formatMoney(a.amount ?? 0)}</td>
                  <td className="px-4 py-3">
                    <ApptStatus item={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No appointments match filters.</p>
          )}
        </div>
      )}
    </div>
  )
}

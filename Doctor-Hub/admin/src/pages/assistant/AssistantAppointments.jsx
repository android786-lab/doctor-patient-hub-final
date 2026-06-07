import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { formatMoney } from '@doctor-hub/constants/currency.js'

function StatusBadge({ status, cancelled }) {
  if (cancelled || status === 'cancelled') {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Cancelled
      </span>
    )
  }
  const map = {
    pending: 'bg-amber-100 text-amber-800',
    awaiting_verification: 'bg-amber-100 text-amber-800',
    payment_uploaded: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-teal-100 text-teal-800',
    completed: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const key = status || 'pending'
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[key] || 'bg-slate-100 text-slate-700'}`}
    >
      {key.replace(/_/g, ' ')}
    </span>
  )
}

export default function AssistantAppointments() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const headers = { atoken: aToken, token: aToken, dtoken: aToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/assistant/appointments`, {
          headers,
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
    if (aToken) load()
  }, [aToken, backendUrl])

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Assistant"
        title="All appointments"
        description="Every appointment for your assigned doctor."
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="dh-card px-8 py-12 text-center text-sm text-slate-500">No appointments yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Date / time</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.patient_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.appointment_date}</td>
                  <td className="px-4 py-3">{formatMoney(row.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} cancelled={row.cancelled} />
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

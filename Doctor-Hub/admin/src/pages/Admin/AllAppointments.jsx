import { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import PageHeader from '../../components/admin/PageHeader'
import AvatarImage from '@doctor-hub/ui/AvatarImage.jsx'

function safeAge(calculateAge, dob) {
  if (!dob || dob === 'Not Selected') return '—'
  const age = calculateAge(dob)
  return Number.isNaN(age) ? '—' : age
}

function ApptStatus({ item }) {
  if (item.cancelled || item.status === 'cancelled') {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        Cancelled
      </span>
    )
  }
  if (item.status === 'confirmed') {
    return (
      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
        Confirmed
      </span>
    )
  }
  if (item.is_completed || item.isCompleted || item.status === 'completed') {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Completed
      </span>
    )
  }
  if (item.status === 'awaiting_verification' || item.status === 'payment_uploaded') {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Awaiting verify
      </span>
    )
  }
  if (item.payment) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Paid
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      Pending
    </span>
  )
}

export default function AllAppointments() {
  const { aToken, appointments, cancelAppointment, getAllAppointments } = useContext(AdminContext)
  const { calculateAge, slotDateFormat, formatMoney } = useContext(AppContext)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!aToken) return
      setLoading(true)
      await getAllAppointments()
      setLoading(false)
    }
    load()
  }, [aToken])

  const list = appointments || []

  const formatSchedule = (item) => {
    const date = item.slot_date
    const time = item.slot_time
    if (date) {
      return { date: slotDateFormat(date), time: time || '—' }
    }
    if (item.scheduled_at) {
      const d = new Date(item.scheduled_at)
      return {
        date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    }
    return { date: '—', time: '—' }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Operations"
        title="All appointments"
        description="Every booking across the platform — cancel if needed or verify payments separately."
      >
        <button type="button" onClick={getAllAppointments} className="dh-btn py-2 text-sm">
          Refresh
        </button>
      </PageHeader>

      <div className="dh-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="font-display text-lg font-semibold text-slate-900">No appointments yet</p>
            <p className="mt-2 text-sm text-slate-500">
              When patients book on the website, rows will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Fee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((item, index) => {
                  const schedule = formatSchedule(item)
                  const done =
                    item.cancelled ||
                    item.status === 'cancelled' ||
                    item.status === 'confirmed' ||
                    item.is_completed ||
                    item.isCompleted ||
                    item.status === 'completed'
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarImage src={item.user_data?.image} name={item.user_data?.name} size="sm" />
                          <span className="font-medium text-slate-900">
                            {item.user_data?.name || 'Patient'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {safeAge(calculateAge, item.user_data?.dob)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="font-medium text-slate-800">{schedule.date}</span>
                        <br />
                        <span className="text-xs">{schedule.time}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarImage src={item.doc_data?.image} name={item.doc_data?.name} size="sm" />
                          <span className="text-slate-800">{item.doc_data?.name || 'Doctor'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.amount != null ? formatMoney(item.amount) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <ApptStatus item={item} />
                      </td>
                      <td className="px-6 py-4">
                        {!done ? (
                          <button
                            type="button"
                            onClick={() => cancelAppointment(item.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && list.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Showing {list.length} appointment{list.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

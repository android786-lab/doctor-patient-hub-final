import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'
import { appointmentChatPath } from '../../utils/staffRole.js'

function StatusBadge({ status }) {
  const tones = {
    confirmed: 'bg-teal-50 text-teal-800 ring-teal-200',
    completed: 'bg-slate-100 text-slate-700 ring-slate-200',
    cancelled: 'bg-red-50 text-red-700 ring-red-200',
    awaiting_verification: 'bg-amber-50 text-amber-900 ring-amber-200',
    payment_uploaded: 'bg-amber-50 text-amber-900 ring-amber-200',
    pending_payment: 'bg-orange-50 text-orange-800 ring-orange-200',
  }
  const tone = tones[status] || 'bg-slate-50 text-slate-600 ring-slate-200'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ring-1 ${tone}`}>
      {String(status || 'pending').replace(/_/g, ' ')}
    </span>
  )
}

function AppointmentActions({ appointment: a, dToken }) {
  if (a.status !== 'confirmed' && a.status !== 'completed') return null
  return (
    <div className="flex flex-wrap gap-3">
      <Link to="/doctor/prescriptions" className="text-sm font-semibold text-teal-700 hover:underline">
        Records
      </Link>
      <Link
        to={appointmentChatPath(a.id, dToken)}
        className="text-sm font-semibold text-slate-600 hover:underline"
      >
        Chat
      </Link>
    </div>
  )
}

export default function DoctorAppointmentsList() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/doctor/appointments`, {
          headers: { dtoken: dToken, token: dToken },
        })
        setItems(data.appointments || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (dToken) load()
  }, [dToken, backendUrl])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Consultations"
        title="Appointments"
        description="All bookings with your profile — pending, confirmed, and completed."
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="dh-card px-6 py-12 text-center text-sm text-slate-500">No appointments yet.</div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((a) => (
              <article key={a.id} className="dh-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{a.patient_name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {a.date || '—'} · {a.time || '—'}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <AppointmentActions appointment={a} dToken={dToken} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.patient_name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.date || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.time || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <AppointmentActions appointment={a} dToken={dToken} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

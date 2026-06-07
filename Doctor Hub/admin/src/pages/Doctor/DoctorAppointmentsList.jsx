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
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ${tone}`}>
      {String(status || 'pending').replace(/_/g, ' ')}
    </span>
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
    <div className="p-6 lg:p-8">
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
        <div className="dh-card px-8 py-12 text-center text-sm text-slate-500">No appointments yet.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
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
                    <div className="flex flex-wrap gap-2">
                      {(a.status === 'confirmed' || a.status === 'completed') && (
                        <>
                          <Link
                            to="/doctor/prescriptions"
                            className="text-xs font-semibold text-teal-700 hover:underline"
                          >
                            Records
                          </Link>
                          <Link
                            to={appointmentChatPath(a.id, dToken)}
                            className="text-xs font-semibold text-slate-600 hover:underline"
                          >
                            Chat
                          </Link>
                        </>
                      )}
                    </div>
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

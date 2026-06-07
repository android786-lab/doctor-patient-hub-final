import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white ring-slate-200/80',
    teal: 'bg-teal-50 ring-teal-200/80 text-teal-900',
    amber: 'bg-amber-50 ring-amber-200/80 text-amber-900',
    sky: 'bg-sky-50 ring-sky-200/80 text-sky-900',
  }
  return (
    <div className={`dh-stat-panel ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  )
}

export default function DoctorDashboard() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const headers = { dtoken: dToken, token: dToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: res } = await axiosClient.get(`${backendUrl}/api/doctor/dashboard`, {
          headers,
        })
        if (res.success) setData(res)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (dToken) load()
  }, [dToken, backendUrl])

  const name = data?.doctorName || 'Doctor'
  const stats = data?.stats || {}

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="dh-portal-panel mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-6 py-7 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Clinical portal</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Dr. {name}</h1>
          <p className="mt-2 text-sm text-teal-100">Your hospital workstation — patients, visits & records.</p>
        </div>
      </div>

      <PageHeader
        eyebrow="Overview"
        title="Today at a glance"
        description="Appointments, patients, and pending payments."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total appointments" value={stats.totalAppointments ?? 0} tone="teal" />
          <StatCard label="Today's appointments" value={stats.todayAppointments ?? 0} tone="sky" />
          <StatCard label="Total patients" value={stats.totalPatients ?? 0} />
          <StatCard label="Pending payments" value={stats.pendingPayments ?? 0} tone="amber" />
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/doctor/profile" className="dh-btn py-2 text-sm">
          My profile
        </Link>
        <Link
          to="/doctor/clinics"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clinics
        </Link>
        <Link
          to="/doctor/schedule"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Schedule
        </Link>
        <Link
          to="/doctor/appointments"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Appointments
        </Link>
      </div>

      {data?.todayAppointments?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Today&apos;s visits
          </h2>
          <ul className="mt-3 space-y-2">
            {data.todayAppointments.map((a) => (
              <li key={a.id} className="dh-card flex justify-between gap-4 p-4 text-sm">
                <span className="font-medium text-slate-900">{a.patient_name}</span>
                <span className="text-slate-500">
                  {a.slot_time} · {a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

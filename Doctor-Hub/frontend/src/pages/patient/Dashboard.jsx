import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext.jsx'
import api from '../../services/api.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { ROUTES } from '../../utils/constants.js'

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-900 ring-slate-200/80',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    teal: 'bg-teal-50 text-teal-900 ring-teal-200/80',
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
  }
  return (
    <div className={`rounded-2xl p-5 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-teal-100 text-teal-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] || map.pending}`}
    >
      {status}
    </span>
  )
}

export default function PatientDashboard() {
  const { user, userData } = useContext(AppContext)
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  const name = (userData?.name || user?.name || user?.full_name || 'there').trim()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/appointments/my')
        setStats(data.stats || { total: 0, pending: 0, confirmed: 0, completed: 0 })
        setRecent(data.recent || [])
      } catch {
        setStats({ total: 0, pending: 0, confirmed: 0, completed: 0 })
        setRecent([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const actions = [
    { to: ROUTES.FIND_DOCTORS, label: 'Find a Doctor', desc: 'Search specialists' },
    { to: ROUTES.APPOINTMENTS, label: 'My Appointments', desc: 'View all bookings' },
    { to: ROUTES.HISTORY, label: 'Medical History', desc: 'Visit records (read only)' },
    { to: ROUTES.PRESCRIPTIONS, label: 'Prescriptions', desc: 'Medicines from visits' },
    { to: ROUTES.PROFILE, label: 'My Profile', desc: 'Update your details' },
  ]

  return (
    <div className="pb-12">
      <div className="dh-portal-panel mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-6 py-8 text-white md:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Patient portal</p>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Welcome, {name}</h1>
          <p className="mt-2 text-sm text-teal-100">
            Your hospital dashboard — appointments, records, and prescriptions in one place.
          </p>
        </div>
      </div>

      <PageHeader
        eyebrow="Overview"
        title="Your care summary"
        description="Track visits and access hospital services."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total appointments" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} tone="amber" />
          <StatCard label="Confirmed" value={stats.confirmed} tone="teal" />
          <StatCard label="Completed" value={stats.completed} tone="green" />
        </div>
      )}

      <div className="mt-10 grid gap-4 grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group dh-dept-card block no-underline"
          >
            <p className="font-semibold text-slate-900 group-hover:text-teal-700">{a.label}</p>
            <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900">Recent appointments</h2>
          <Link to={ROUTES.APPOINTMENTS} className="text-sm font-semibold text-teal-700 hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="dh-card px-6 py-10 text-center text-sm text-slate-500">
            No appointments yet.{' '}
            <Link to={ROUTES.FIND_DOCTORS} className="font-semibold text-teal-700">
              Find a doctor
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recent.map((a) => (
              <article key={a.id} className="dh-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{a.doctor_name}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {a.slot_date} · {a.slot_time}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

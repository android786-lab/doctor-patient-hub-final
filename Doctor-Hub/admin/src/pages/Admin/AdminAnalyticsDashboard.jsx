import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import Loader from '../../components/shared/Loader.jsx'
import { AppointmentsBarChart, TreatmentPieChart } from '../../components/charts/AdminAnalyticsCharts.jsx'
import { roleFromToken } from '../../utils/staffRole.js'
import { formatMoney } from '@doctor-hub/constants/currency.js'

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export default function AdminAnalyticsDashboard({ basePath = '/admin', embedded = false }) {
  const { aToken, backendUrl } = useContext(AdminContext)
  const isSuper = roleFromToken(aToken) === 'super_admin'
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const headers = { atoken: aToken, token: aToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/admin/analytics`, { headers })
        if (data.success) setAnalytics(data.analytics)
        else toast.error(data.message)
      } catch (e) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    if (aToken) load()
  }, [aToken, backendUrl])

  const quickLinks = [
    { to: `${basePath}/doctors`, label: 'Doctors' },
    { to: `${basePath}/patients`, label: 'Patients' },
    { to: `${basePath}/appointments`, label: 'Appointments' },
    { to: `${basePath}/payments`, label: 'Payments' },
    { to: '/verify-payments', label: 'Verify payments' },
  ]

  if (isSuper) {
    quickLinks.push(
      { to: '/superadmin/admins', label: 'Manage admins' },
      { to: '/superadmin/users', label: 'Delete users' }
    )
  }

  return (
    <div className={embedded ? '' : 'p-5 lg:p-7'}>
      {!embedded && (
        <PageHeader
          eyebrow={isSuper ? 'Super Admin' : 'Administration'}
          title="Dashboard"
          description="Platform analytics and quick navigation."
        />
      )}

      {loading ? (
        <Loader />
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total doctors" value={analytics.total_doctors} />
            <StatCard label="Total patients" value={analytics.total_patients} />
            <StatCard label="Appointments today" value={analytics.appointments_today ?? 0} />
            <StatCard
              label="Total revenue"
              value={formatMoney(analytics.total_revenue)}
              hint={`${analytics.total_appointments} total bookings`}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="dh-card min-w-0 p-6">
              <h2 className="text-sm font-semibold text-slate-900">Appointments per day (7 days)</h2>
              <div className="mt-4">
                <AppointmentsBarChart data={analytics.appointments_per_day} />
              </div>
            </div>
            <div className="dh-card min-w-0 p-6">
              <h2 className="text-sm font-semibold text-slate-900">Doctors by treatment type</h2>
              <div className="mt-4">
                <TreatmentPieChart data={analytics.treatment_types} />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!embedded && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold text-slate-900">Quick links</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-teal-800 hover:border-teal-300 hover:shadow-sm"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

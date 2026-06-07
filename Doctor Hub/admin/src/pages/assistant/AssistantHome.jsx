import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'

const quickLinks = [
  { to: '/assistant/pending-payments', label: 'Pending payments', desc: 'Verify or reject proofs' },
  { to: '/assistant/appointments', label: 'All appointments', desc: 'Full list with status' },
  { to: '/assistant/bookings', label: 'Bookings', desc: 'Bookings with payment info' },
]

export default function AssistantHome() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const headers = { atoken: aToken, token: aToken, dtoken: aToken }

  const load = async () => {
    setLoading(true)
    try {
      const { data: res } = await axiosClient.get(`${backendUrl}/api/assistant/dashboard`, {
        headers,
      })
      if (res.success) setData(res)
      else toast.error(res.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const stats = data?.stats || {}
  const pending = stats.pending_payments ?? data?.payments?.pending ?? 0
  const today = stats.today_appointments ?? 0
  const confirmedToday = stats.confirmed_today ?? 0
  const assignment = data?.assignment

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Assistant portal"
        title="Dashboard"
        description={
          assignment
            ? `You assist Dr. ${assignment.doctorName}. Payments and bookings for this doctor only.`
            : 'Loading your assigned doctor…'
        }
      >
        <button type="button" onClick={load} className="dh-btn py-2 text-sm">
          Refresh
        </button>
      </PageHeader>

      {assignment && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
          <span className="font-semibold">Assigned doctor:</span> {assignment.doctorName}
          {assignment.doctorSpecialization && (
            <span className="text-teal-700"> · {assignment.doctorSpecialization}</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div
              className={`rounded-2xl p-6 ${
                pending > 0
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
                  : 'bg-white ring-1 ring-slate-200'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  pending > 0 ? 'opacity-90' : 'text-slate-500'
                }`}
              >
                Pending payments
              </p>
              <p
                className={`mt-1 font-display text-4xl font-bold ${
                  pending > 0 ? '' : 'text-slate-900'
                }`}
              >
                {pending}
              </p>
              {pending > 0 && (
                <Link
                  to="/assistant/pending-payments"
                  className="mt-3 inline-block text-sm font-semibold underline opacity-90"
                >
                  Review now →
                </Link>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Today&apos;s appointments
              </p>
              <p className="mt-1 font-display text-4xl font-bold text-slate-900">{today}</p>
            </div>

            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confirmed today
              </p>
              <p className="mt-1 font-display text-4xl font-bold text-emerald-700">
                {confirmedToday}
              </p>
            </div>
          </div>

          <h2 className="mb-3 mt-10 text-sm font-semibold text-slate-900">Quick access</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-md"
              >
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

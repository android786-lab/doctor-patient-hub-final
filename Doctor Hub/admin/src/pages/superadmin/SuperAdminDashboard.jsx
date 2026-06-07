import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import AdminAnalyticsDashboard from '../Admin/AdminAnalyticsDashboard'

function StatCard({ label, value, hint, accent }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        accent ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200/80'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

const quickLinks = [
  { to: '/admin/doctors', label: 'Doctors', desc: 'Verify & manage' },
  { to: '/admin/patients', label: 'Patients', desc: 'All patients' },
  { to: '/admin/appointments', label: 'Appointments', desc: 'Filter by status/date' },
  { to: '/admin/payments', label: 'Payments', desc: 'All payment records' },
  { to: '/superadmin/admins', label: 'Admins', desc: 'Promote / demote' },
  { to: '/superadmin/users', label: 'Delete users', desc: 'Protected medical history' },
  { to: '/verify-payments', label: 'Verify payments', desc: 'Pending proofs' },
  { to: '/add-doctor', label: 'Add doctor', desc: 'Onboard specialists' },
]

export default function SuperAdminDashboard() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const headers = { atoken: aToken, token: aToken }

  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ovRes, reqRes] = await Promise.all([
        axiosClient.get(`${backendUrl}/api/admin/super/overview`, { headers }),
        axiosClient.get(`${backendUrl}/api/admin/registration-requests`, {
          headers,
          params: filter ? { status: filter } : {},
        }),
      ])
      setOverview(ovRes.data)
      setRequests(reqRes.data.requests || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken, filter])

  const approve = async (id) => {
    try {
      await axiosClient.patch(
        `${backendUrl}/api/admin/registration-requests/${id}/approve`,
        {},
        { headers }
      )
      toast.success('Admin approved — they can sign in now')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional):') || ''
    try {
      await axiosClient.patch(
        `${backendUrl}/api/admin/registration-requests/${id}/reject`,
        { reason },
        { headers }
      )
      toast.success('Request rejected')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const stats = overview?.stats

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: `Admin approvals${stats?.pendingAdminRequests ? ` (${stats.pendingAdminRequests})` : ''}` },
    { id: 'platform', label: 'Platform management' },
  ]

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Super Admin"
        title="Control center"
        description="Full access to Doctor Hub — approve admins, manage staff, doctors, patients, and payments."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== 'platform' ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      ) : tab === 'overview' ? (
        <div className="space-y-6">
          <AdminAnalyticsDashboard embedded basePath="/admin" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pending admin requests"
              value={stats?.pendingAdminRequests ?? 0}
              accent={stats?.pendingAdminRequests > 0}
              hint="Requires your approval"
            />
            <StatCard label="Users" value={stats?.totalUsers ?? 0} />
            <StatCard
              label="Doctors"
              value={stats?.totalDoctors ?? 0}
              hint={`${stats?.unverifiedDoctors ?? 0} unverified`}
            />
            <StatCard label="Patients" value={stats?.totalPatients ?? 0} />
            <StatCard label="Appointments" value={stats?.totalAppointments ?? 0} />
            <StatCard
              label="Payment queue"
              value={stats?.pendingPaymentVerifications ?? 0}
              hint="Awaiting verification"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Quick access</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          {(overview?.pendingAdminRequests?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-semibold text-amber-900">New admin registrations</p>
              <ul className="mt-2 space-y-2">
                {overview.pendingAdminRequests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {r.full_name} ·{' '}
                      <a href={`tel:${r.phone}`} className="font-medium text-teal-800">
                        {r.phone}
                      </a>
                    </span>
                    <button
                      type="button"
                      onClick={() => setTab('approvals')}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Review
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : tab === 'approvals' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['pending', 'approved', 'rejected', ''].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                  filter === s ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'
                }`}
              >
                {s || 'all'}
              </button>
            ))}
          </div>

          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500">
              No registration requests in this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <article
                  key={r.id}
                  className={`rounded-xl border bg-white p-4 ${
                    r.status === 'pending' ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{r.full_name}</p>
                      <p className="text-sm text-slate-600">{r.email}</p>
                      <p className="mt-1 text-sm">
                        <span className="text-slate-500">Phone: </span>
                        <a href={`tel:${r.phone}`} className="font-semibold text-teal-700">
                          {r.phone}
                        </a>
                      </p>
                      {r.organization_name && (
                        <p className="text-xs text-slate-500">Org: {r.organization_name}</p>
                      )}
                      {r.message && (
                        <p className="mt-2 text-xs text-slate-600">Note: {r.message}</p>
                      )}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {r.status} · {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approve(r.id)}
                          className="dh-btn py-2 text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(r.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <AdminAnalyticsDashboard embedded basePath="/admin" />
      )}
    </div>
  )
}

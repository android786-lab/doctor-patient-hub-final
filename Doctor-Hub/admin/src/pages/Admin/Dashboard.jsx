import { useContext, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import PageHeader from '../../components/admin/PageHeader'
import StatCard from '../../components/admin/StatCard'
import AvatarImage from '@doctor-hub/ui/AvatarImage.jsx'

function IconDoctors() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4m8-4v4M4 10h16M6 4h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  )
}

function IconPatients() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function BookingStatus({ item }) {
  if (item.cancelled) {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Cancelled
      </span>
    )
  }
  if (item.is_completed || item.isCompleted) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Completed
      </span>
    )
  }
  if (item.payment) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        Paid
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Pending
    </span>
  )
}

const quickActions = [
  {
    to: '/add-doctor',
    title: 'Register doctor',
    desc: 'Add a specialist to the public directory',
    color: 'bg-teal-50 text-teal-800 border-teal-100',
  },
  {
    to: '/verify-payments',
    title: 'Verify payments',
    desc: 'Confirm Stripe bookings awaiting approval',
    color: 'bg-amber-50 text-amber-900 border-amber-100',
  },
  {
    to: '/all-appointments',
    title: 'All appointments',
    desc: 'View and manage every patient booking',
    color: 'bg-sky-50 text-sky-900 border-sky-100',
  },
  {
    to: '/doctor-list',
    title: 'Doctor directory',
    desc: 'Toggle availability and review profiles',
    color: 'bg-violet-50 text-violet-900 border-violet-100',
  },
]

export default function Dashboard() {
  const { aToken, getDashData, cancelAppointment, dashData, dashLoading, dashError } =
    useContext(AdminContext)
  const { slotDateFormat, formatMoney } = useContext(AppContext)

  useEffect(() => {
    if (aToken) getDashData()
  }, [aToken])

  const latest = dashData?.latestAppointments || []

  const pendingCount = useMemo(
    () =>
      latest.filter(
        (a) => !a.cancelled && !a.is_completed && !a.isCompleted && !a.payment
      ).length,
    [latest]
  )

  if (dashLoading && !dashData) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-32 animate-pulse rounded-3xl bg-gradient-to-r from-slate-200 to-slate-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  if (dashError && !dashData) {
    return (
      <div className="p-6 lg:p-8">
        <PageHeader eyebrow="Overview" title="Admin dashboard" />
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {dashError}
        </p>
      </div>
    )
  }

  if (!dashData) return null

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-6 lg:p-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 px-6 py-8 text-white md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/4 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">
              Doctor Hub · Admin
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Welcome back
            </h1>
            <p className="mt-2 max-w-lg text-sm text-teal-100/90">{today}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/add-doctor"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 shadow-lg hover:bg-teal-50"
            >
              + Add doctor
            </Link>
            <a
              href={import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173'}
              className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Patient site →
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Registered doctors"
          value={dashData.doctors}
          icon={<IconDoctors />}
          accent="teal"
          to="/doctor-list"
          hint="Manage directory & availability"
        />
        <StatCard
          label="Total appointments"
          value={dashData.appointments}
          icon={<IconCalendar />}
          accent="blue"
          to="/all-appointments"
          hint={pendingCount > 0 ? `${pendingCount} recent pending` : 'All time bookings'}
        />
        <StatCard
          label="Patients"
          value={dashData.patients}
          icon={<IconPatients />}
          accent="violet"
          hint="Registered patient accounts"
        />
      </div>

      {/* Quick actions */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${action.color}`}
            >
              <p className="font-semibold">{action.title}</p>
              <p className="mt-1 text-xs opacity-80">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest bookings */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">Latest bookings</h2>
            <p className="text-sm text-slate-500">Most recent patient appointments</p>
          </div>
          <Link
            to="/all-appointments"
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="dh-card overflow-hidden">
          {latest.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <IconCalendar />
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-slate-900">
                No bookings yet
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                When patients book on the website, they will appear here. Add doctors so patients
                can find them.
              </p>
              <Link to="/add-doctor" className="dh-btn mt-6">
                Add your first doctor
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Schedule</th>
                    <th className="px-6 py-4">Fee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latest.slice(0, 8).map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarImage
                            src={item.doc_data?.image}
                            name={item.doc_data?.name}
                            size="sm"
                            className="rounded-xl"
                          />
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.doc_data?.name || 'Doctor'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.user_data?.name || 'Patient'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="font-medium text-slate-800">
                          {slotDateFormat(item.slot_date)}
                        </span>
                        <br />
                        <span className="text-xs">{item.slot_time}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.amount != null ? formatMoney(item.amount) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <BookingStatus item={item} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!item.cancelled && !item.is_completed && !item.isCompleted ? (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

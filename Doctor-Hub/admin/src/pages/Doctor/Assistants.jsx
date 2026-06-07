import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'
import Loader from '../../components/shared/Loader.jsx'

export default function DoctorAssistants() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [assistant, setAssistant] = useState(null)
  const [loading, setLoading] = useState(true)

  const headers = { dtoken: dToken, token: dToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/doctor/assistant`, { headers })
        if (data.success) setAssistant(data.assistant)
        else toast.error(data.message)
      } catch (e) {
        toast.error(e.message)
        setAssistant(null)
      } finally {
        setLoading(false)
      }
    }
    if (dToken) load()
  }, [dToken, backendUrl])

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Your team"
        title="Assistant"
        description="Staff member who verifies payments and manages bookings for your practice."
      />

      {loading ? (
        <Loader />
      ) : !assistant ? (
        <div className="dh-card max-w-lg px-8 py-12 text-center">
          <p className="font-semibold text-slate-900">No assistant assigned</p>
          <p className="mt-2 text-sm text-slate-500">
            Ask your admin or super admin to create an assistant account and link it to your
            doctor profile.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="dh-card p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl">
              👤
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-slate-900">
              {assistant.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{assistant.email}</p>
            {assistant.phone && (
              <p className="mt-1 text-sm text-slate-500">{assistant.phone}</p>
            )}
            <span
              className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                assistant.isActive
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {assistant.isActive ? 'Active account' : 'Inactive'}
            </span>
            {assistant.assignedAt && (
              <p className="mt-4 text-xs text-slate-400">
                Assigned {new Date(assistant.assignedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Activity overview
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="dh-card p-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Pending payments</p>
                <p className="mt-2 font-display text-3xl font-bold text-orange-600">
                  {assistant.activity?.pendingPayments ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">Awaiting verification for your patients</p>
              </div>
              <div className="dh-card p-5">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Today&apos;s appointments
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-slate-900">
                  {assistant.activity?.todayAppointments ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">Scheduled for today</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Your assistant works in the staff portal under{' '}
              <strong>Pending payments</strong> and <strong>Appointments</strong>. They cannot change
              your medical records or prescriptions.
            </p>
            <Link to="/doctor/messages" className="dh-btn-outline inline-flex text-sm">
              Open messages inbox →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

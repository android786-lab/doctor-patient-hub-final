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
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignEmail, setAssignEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const headers = { dtoken: dToken, token: dToken }

  const load = async () => {
    setLoading(true)
    try {
      const [asstRes, candRes] = await Promise.all([
        axiosClient.get(`${backendUrl}/api/doctor/assistant`, { headers }),
        axiosClient.get(`${backendUrl}/api/doctor/assistant/candidates`, { headers }),
      ])
      if (asstRes.data.success) setAssistant(asstRes.data.assistant)
      if (candRes.data.success) setCandidates(candRes.data.candidates || [])
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
      setAssistant(null)
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dToken) load()
  }, [dToken, backendUrl])

  const assignByEmail = async (e) => {
    e.preventDefault()
    const email = assignEmail.trim()
    if (!email) return toast.warn('Enter assistant email')
    setBusy(true)
    try {
      const { data } = await axiosClient.post(
        `${backendUrl}/api/doctor/assistant/assign`,
        { email },
        { headers }
      )
      if (data.success) {
        toast.success(data.message)
        setAssignEmail('')
        load()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  const assignCandidate = async (userId) => {
    setBusy(true)
    try {
      const { data } = await axiosClient.post(
        `${backendUrl}/api/doctor/assistant/assign`,
        { assistantUserId: userId },
        { headers }
      )
      if (data.success) {
        toast.success(data.message)
        load()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  const removeAssistant = async () => {
    if (!window.confirm('Remove assistant from your practice?')) return
    setBusy(true)
    try {
      const { data } = await axiosClient.delete(`${backendUrl}/api/doctor/assistant`, { headers })
      if (data.success) {
        toast.success(data.message)
        load()
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Your team"
        title="Assistant"
        description="Assign staff to verify payments and manage bookings for your practice."
      />

      {loading ? (
        <Loader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="space-y-4">
            {assistant ? (
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
                <button
                  type="button"
                  disabled={busy}
                  onClick={removeAssistant}
                  className="mt-5 w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Remove assistant
                </button>
              </div>
            ) : (
              <div className="dh-card p-6">
                <p className="font-semibold text-slate-900">No assistant assigned</p>
                <p className="mt-2 text-sm text-slate-500">
                  Assign an existing assistant account by email, or pick from the list.
                </p>
                <form onSubmit={assignByEmail} className="mt-4 space-y-3">
                  <input
                    type="email"
                    className="dh-input w-full"
                    placeholder="assistant@hospital.com"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                  />
                  <button type="submit" disabled={busy} className="dh-btn w-full py-2 text-sm">
                    Assign by email
                  </button>
                </form>
              </div>
            )}

            {assistant && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="dh-card p-5">
                  <p className="text-xs font-semibold uppercase text-slate-500">Pending payments</p>
                  <p className="mt-2 font-display text-3xl font-bold text-orange-600">
                    {assistant.activity?.pendingPayments ?? 0}
                  </p>
                </div>
                <div className="dh-card p-5">
                  <p className="text-xs font-semibold uppercase text-slate-500">Today&apos;s visits</p>
                  <p className="mt-2 font-display text-3xl font-bold text-slate-900">
                    {assistant.activity?.todayAppointments ?? 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="dh-card p-6">
            <h3 className="font-semibold text-slate-900">Available assistants</h3>
            <p className="mt-1 text-sm text-slate-500">
              Accounts with the assistant role. You can assign one to your practice.
            </p>
            <ul className="mt-4 divide-y divide-slate-100">
              {candidates.length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-500">
                  No assistant accounts yet — ask admin to create one.
                </li>
              ) : (
                candidates.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-500">{c.email}</p>
                    </div>
                    {c.assignedToYou ? (
                      <span className="text-xs font-semibold text-teal-700">Assigned to you</span>
                    ) : c.assignedElsewhere ? (
                      <span className="text-xs text-slate-400">Assigned elsewhere</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !!assistant}
                        onClick={() => assignCandidate(c.id)}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        Assign
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
            <Link to="/doctor/messages" className="dh-btn-outline mt-6 inline-flex text-sm">
              Open messages inbox →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

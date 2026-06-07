import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'

export default function AssistantDashboard() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data: res } = await axiosClient.get(`${backendUrl}/api/admin/assistant/dashboard`, {
        headers: { atoken: aToken, token: aToken },
      })
      setData(res)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const confirm = async (appointmentId) => {
    try {
      let res
      try {
        ;({ data: res } = await axiosClient.post(
          `${backendUrl}/api/payments/confirm`,
          { appointmentId },
          { headers: { atoken: aToken, token: aToken } }
        ))
      } catch {
        ;({ data: res } = await axiosClient.post(
          `${backendUrl}/api/assistant/confirm-appointment`,
          { appointmentId },
          { headers: { atoken: aToken, token: aToken } }
        ))
      }
      if (res.success) {
        toast.success('Payment verified')
        load()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(e.message)
    }
  }

  useEffect(() => {
    if (aToken) load()
  }, [aToken])

  const pending = data?.pendingCount ?? 0
  const urgent = pending > 0

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Assistant"
        title="Payment verification"
        description="Confirm patient payments to activate appointments."
      >
        <button type="button" onClick={load} className="dh-btn py-2 text-sm">
          Refresh
        </button>
      </PageHeader>

      <div
        className={`mb-8 rounded-2xl p-8 text-center ring-2 ${
          urgent ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white ring-orange-300' : 'bg-teal-50 text-teal-900 ring-teal-200'
        }`}
      >
        <p className="text-sm font-semibold uppercase tracking-wide opacity-90">
          Pending verifications
        </p>
        <p className="mt-2 font-display text-6xl font-bold">{pending}</p>
        {urgent && (
          <p className="mt-2 text-sm opacity-90">Action required — patients are waiting</p>
        )}
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="dh-card p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Verified today</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {data?.stats?.verifiedToday ?? 0}
          </p>
        </div>
        <div className="dh-card p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Rejected today</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {data?.stats?.rejectedToday ?? 0}
          </p>
        </div>
        <div className="dh-card p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Total processed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {data?.stats?.totalProcessed ?? 0}
          </p>
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold text-slate-900">Pending payments</h2>
      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-200" />
      ) : (data?.pending || []).length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No pending verifications.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.pending.map((a) => (
            <div key={a.id} className="dh-card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold text-slate-900">{a.patient_name}</p>
                <p className="text-sm text-slate-500">
                  Dr. {a.doctor_name} · {a.slot_date} {a.slot_time}
                </p>
              </div>
              <button type="button" onClick={() => confirm(a.id)} className="dh-btn py-2 text-sm">
                Verify payment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

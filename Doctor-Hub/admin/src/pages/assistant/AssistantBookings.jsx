import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { formatMoney } from '@doctor-hub/constants/currency.js'

function PatientHistoryPanel({ patientId, backendUrl, headers }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!patientId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(
          `${backendUrl}/api/assistant/patients/${patientId}/history`,
          { headers }
        )
        if (!cancelled && data.success) setHistory(data.history || [])
      } catch {
        if (!cancelled) setHistory([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [patientId, backendUrl, headers])

  if (loading) return <p className="mt-3 text-xs text-slate-500">Loading prior visits…</p>
  if (!history.length) return null

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prior visits</p>
      <ul className="mt-2 space-y-2">
        {history.slice(0, 5).map((h) => (
          <li key={h.id} className="text-xs text-slate-700">
            <span className="font-medium">{h.appointment_date}</span>
            <span className="text-slate-500"> · {h.status}</span>
            {h.ended_early && h.early_end_reason ? (
              <p className="mt-0.5 text-amber-800">Early end: {h.early_end_reason}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AssistantBookings() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedPatient, setExpandedPatient] = useState(null)

  const headers = { atoken: aToken, token: aToken, dtoken: aToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/assistant/bookings`, {
          headers,
        })
        if (data.success) setList(data.bookings || [])
        else toast.error(data.message)
      } catch (e) {
        toast.error(e.message)
        setList([])
      } finally {
        setLoading(false)
      }
    }
    if (aToken) load()
  }, [aToken, backendUrl])

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Assistant"
        title="Bookings"
        description="All bookings with payment details for your doctor."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : list.length === 0 ? (
        <div className="dh-card px-8 py-12 text-center text-sm text-slate-500">No bookings yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((b) => (
            <article key={b.id} className="dh-card p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{b.patient_name}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                  {b.status || 'pending'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{b.appointment_date}</p>
              <p className="mt-2 text-sm font-semibold text-teal-700">{formatMoney(b.amount)}</p>
              {b.payment_method && (
                <p className="mt-1 text-xs text-slate-500">Method: {b.payment_method}</p>
              )}
              {b.payment_status && (
                <p className="mt-1 text-xs text-slate-500">Payment: {b.payment_status}</p>
              )}
              {b.ended_early && b.early_end_reason ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Last ended early: {b.early_end_reason}
                </p>
              ) : null}
              {b.screenshot_url && (
                <a
                  href={b.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline"
                >
                  View payment screenshot
                </a>
              )}
              {b.patient_id ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-teal-700 hover:underline"
                  onClick={() =>
                    setExpandedPatient((prev) => (prev === b.patient_id ? null : b.patient_id))
                  }
                >
                  {expandedPatient === b.patient_id ? 'Hide prior visits' : 'View prior visits'}
                </button>
              ) : null}
              {expandedPatient === b.patient_id && b.patient_id ? (
                <PatientHistoryPanel
                  patientId={b.patient_id}
                  backendUrl={backendUrl}
                  headers={headers}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

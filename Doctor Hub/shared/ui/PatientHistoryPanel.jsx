import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

function PrescriptionList({ items }) {
  if (!items?.length) {
    return <p className="text-xs text-slate-500">No prescriptions for this visit.</p>
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((p, i) => (
        <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
          <p className="font-semibold text-slate-900">{p.medicine_name}</p>
          <p className="mt-0.5 text-slate-600">
            {[p.dosage, p.duration].filter((x) => x && x !== '—').join(' · ') || '—'}
          </p>
        </li>
      ))}
    </ul>
  )
}

function AttachmentList({ items, historyId, downloadAttachmentUrl, getAuthHeaders }) {
  if (!items?.length) return null

  const downloadFile = async (index, name) => {
    if (!downloadAttachmentUrl || !historyId) return
    try {
      const headers = getAuthHeaders?.() || {}
      const res = await fetch(downloadAttachmentUrl(historyId, index), {
        headers,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Download failed')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/i)
      const filename = match?.[1] || name || `report-${historyId.slice(0, 8)}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e.message || 'Download failed')
    }
  }

  return (
    <ul className="mt-2 space-y-1">
      {items.map((a, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => downloadFile(i, a.name)}
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            {a.name ? `Download ${a.name}` : `Download file ${i + 1}`}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function PatientHistoryPanel({
  appointmentId,
  fetchHistory,
  downloadPdfUrl,
  downloadAttachmentUrl,
  getAuthHeaders,
  onClose,
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const result = await fetchHistory(appointmentId)
        if (!cancelled) setData(result)
      } catch (e) {
        if (!cancelled) {
          toast.error(e.message || 'Failed to load history')
          setData({ history: [], patient: null })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (appointmentId) load()
    return () => {
      cancelled = true
    }
  }, [appointmentId, fetchHistory])

  const downloadPdf = async (historyId) => {
    try {
      const headers = getAuthHeaders?.() || {}
      const res = await fetch(downloadPdfUrl(historyId), { headers, credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Download failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prescription-${historyId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Patient history</p>
          <p className="text-sm font-semibold text-slate-900">
            {data?.patient?.name || 'Patient'} — full timeline
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        )}
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : !data?.history?.length ? (
          <p className="text-sm text-slate-500">No medical history on file for this patient yet.</p>
        ) : (
          <div className="space-y-3">
            {data.history.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-500">
                  {new Date(entry.created_at).toLocaleDateString()} ·{' '}
                  {entry.record_type === 'patient_report' ? 'Patient upload' : entry.doctor_name}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{entry.diagnosis}</p>
                {entry.notes && <p className="mt-1 text-xs text-slate-600">{entry.notes}</p>}
                <AttachmentList
                  items={entry.attachments}
                  historyId={entry.id}
                  downloadAttachmentUrl={downloadAttachmentUrl}
                  getAuthHeaders={getAuthHeaders}
                />
                {entry.record_type !== 'patient_report' && (
                  <>
                    <PrescriptionList items={entry.prescriptions} />
                    {entry.prescriptions?.length > 0 && downloadPdfUrl && (
                      <button
                        type="button"
                        onClick={() => downloadPdf(entry.id)}
                        className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
                      >
                        Download e-prescription PDF
                      </button>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

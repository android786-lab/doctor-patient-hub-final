import { useContext, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function PatientHistory() {
  const { patientId } = useParams()
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const headers = { dtoken: dToken, token: dToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(
          `${backendUrl}/api/doctor/medical-history/${patientId}`,
          { headers }
        )
        if (data.success) setHistory(data.history || [])
        else toast.error(data.message)
      } catch (e) {
        toast.error(e.response?.data?.message || e.message)
        setHistory([])
      } finally {
        setLoading(false)
      }
    }
    if (dToken && patientId) load()
  }, [dToken, patientId, backendUrl])

  const downloadAttachment = async (historyId, index, name) => {
    try {
      const res = await fetch(
        `${backendUrl}/api/history/${historyId}/attachments/${index}/download`,
        { headers, credentials: 'include' }
      )
      if (!res.ok) throw new Error('Download failed')
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
      toast.error(e.message)
    }
  }

  const downloadPdf = async (historyId) => {
    try {
      const res = await fetch(`${backendUrl}/api/history/${historyId}/prescription.pdf`, {
        headers,
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Download failed')
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
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Patient chart"
        title="Medical history"
        description="Timeline of visits and prescriptions (read-only, records cannot be deleted)."
      >
        <Link to="/doctor/patients" className="text-sm font-semibold text-teal-700 hover:underline">
          ← Patients
        </Link>
      </PageHeader>

      <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Medical history is append-only. Prescriptions cannot be edited after creation.
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="dh-card px-8 py-12 text-center text-sm text-slate-500">
          No records for this patient yet.
        </div>
      ) : (
        <ol className="relative border-l-2 border-teal-200 pl-8">
          {history.map((entry) => (
            <li key={entry.id} className="mb-8">
              <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-teal-600 ring-4 ring-white" />
              <time className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                {formatDate(entry.created_at)}
              </time>
              <article className="mt-2 dh-card p-5">
                <p className="text-sm font-semibold text-slate-900">
                  {entry.doctor_name}
                  {entry.doctor_specialization && (
                    <span className="font-normal text-slate-500">
                      {' '}
                      · {entry.doctor_specialization}
                    </span>
                  )}
                </p>
                {entry.symptoms && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Symptoms:</span> {entry.symptoms}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-800">
                  <span className="font-medium">Diagnosis:</span> {entry.diagnosis}
                </p>
                {entry.notes && (
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{entry.notes}</p>
                )}
                {entry.record_type === 'patient_report' && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Patient lab report
                  </p>
                )}
                {entry.attachments?.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Attachments</p>
                    <ul className="mt-2 space-y-1">
                      {entry.attachments.map((a, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(entry.id, i, a.name)}
                            className="text-xs font-semibold text-teal-700 hover:underline"
                          >
                            Download {a.name || `file ${i + 1}`}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.prescriptions?.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Prescription</p>
                    <ul className="mt-2 space-y-2">
                      {entry.prescriptions.map((rx, i) => (
                        <li
                          key={i}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                        >
                          <p className="font-semibold text-slate-900">{rx.medicine_name}</p>
                          <p className="text-slate-600">
                            {[rx.dosage, rx.duration].filter((x) => x && x !== '—').join(' · ')}
                          </p>
                          {rx.instructions && rx.instructions !== '—' && (
                            <p className="text-xs text-slate-500">{rx.instructions}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {entry.has_pdf && (
                      <button
                        type="button"
                        onClick={() => downloadPdf(entry.id)}
                        className="mt-3 text-xs font-semibold text-teal-700 hover:underline"
                      >
                        Download e-prescription PDF
                      </button>
                    )}
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

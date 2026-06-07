import { useCallback, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import api from '../../services/api.js'
import { API_BASE_URL } from '../../utils/constants.js'
import { downloadHistoryAttachment } from '../../utils/downloadAttachment.js'



function PrescriptionList({ items, historyId, onDownload }) {

  if (!items?.length) {

    return <p className="text-xs text-slate-500">No prescriptions for this visit.</p>

  }

  return (

    <ul className="mt-2 space-y-2">

      {items.map((p, i) => (

        <li

          key={i}

          className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"

        >

          <p className="font-semibold text-slate-900">{p.medicine_name}</p>

          <p className="mt-0.5 text-slate-600">

            {[p.dosage, p.duration].filter((x) => x && x !== '—').join(' · ') || '—'}

          </p>

          {p.instructions && p.instructions !== '—' && (

            <p className="mt-0.5 text-slate-500">{p.instructions}</p>

          )}

        </li>

      ))}

      {onDownload && (

        <li>

          <button

            type="button"

            onClick={() => onDownload(historyId)}

            className="text-xs font-semibold text-teal-700 hover:underline"

          >

            Download e-prescription PDF

          </button>

        </li>

      )}

    </ul>

  )

}



function AttachmentList({ items, historyId }) {

  if (!items?.length) return null

  return (

    <ul className="mt-2 space-y-1">

      {items.map((a, i) => (

        <li key={i}>

          <button

            type="button"

            onClick={() =>

              downloadHistoryAttachment(historyId, i, a.name || `report-${i + 1}.pdf`).catch(

                (err) => toast.error(err.message || 'Download failed')

              )

            }

            className="text-xs font-semibold text-teal-700 hover:underline"

          >

            Download {a.name || `file ${i + 1}`}

          </button>

        </li>

      ))}

    </ul>

  )

}



function HistoryCard({ entry, onDownloadPdf }) {

  const rxCount = entry.prescriptions?.length ?? 0

  const [openRx, setOpenRx] = useState(rxCount > 0)

  const isReport = entry.record_type === 'patient_report'



  const date = new Date(entry.created_at).toLocaleDateString(undefined, {

    weekday: 'short',

    day: 'numeric',

    month: 'short',

    year: 'numeric',

  })



  return (

    <article className="relative pl-5">

      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-teal-600 ring-2 ring-teal-100" />

      <div className="dh-visit-card p-4 shadow-sm">

        <div className="flex flex-wrap items-start justify-between gap-2">

          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">

            {date}

            {isReport && (

              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">

                Your upload

              </span>

            )}

          </p>

          {rxCount > 0 && !isReport && (

            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800">

              {rxCount} medicine{rxCount === 1 ? '' : 's'}

            </span>

          )}

        </div>

        <p className="mt-1.5 text-xs text-slate-600">

          <span className="font-medium text-slate-800">{entry.doctor_name}</span>

          {entry.doctor_specialization && (

            <span className="text-slate-500"> · {entry.doctor_specialization}</span>

          )}

        </p>

        <p className="mt-2 text-sm font-semibold text-slate-900">{entry.diagnosis}</p>

        {entry.notes && (

          <p className="mt-1 text-xs leading-relaxed text-slate-600">{entry.notes}</p>

        )}

        <AttachmentList items={entry.attachments} historyId={entry.id} />



        {!isReport && (

          <>

            <button

              type="button"

              onClick={() => setOpenRx((v) => !v)}

              className="mt-2.5 text-xs font-semibold text-teal-700 hover:underline"

            >

              {openRx

                ? 'Hide prescriptions'

                : rxCount

                  ? `View prescriptions (${rxCount})`

                  : 'View prescriptions'}

            </button>

            {openRx && (

              <PrescriptionList

                items={entry.prescriptions}

                historyId={entry.id}

                onDownload={onDownloadPdf}

              />

            )}

          </>

        )}

      </div>

    </article>

  )

}



export default function MedicalHistory() {

  const [history, setHistory] = useState([])

  const [loading, setLoading] = useState(true)

  const [uploading, setUploading] = useState(false)

  const [title, setTitle] = useState('')

  const [description, setDescription] = useState('')

  const [files, setFiles] = useState(null)



  const load = useCallback(async () => {

    setLoading(true)

    try {

      let data
      try {
        const res = await api.get('/patient/history')
        data = res.data
      } catch {
        const res = await api.get('/history/my')
        data = res.data
      }

      setHistory(Array.isArray(data.history) ? data.history : [])

    } catch (e) {

      if (!e.isAuthError) toast.error(e.message || 'Failed to load history')

      setHistory([])

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    load()

  }, [load])



  const downloadPdf = async (historyId) => {

    try {

      const token = localStorage.getItem('token')

      const res = await fetch(`${API_BASE_URL}/history/${historyId}/prescription.pdf`, {

        credentials: 'include',

        headers: token ? { token } : {},

      })

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



  const uploadReport = async (e) => {

    e.preventDefault()

    if (!title.trim()) {

      toast.warn('Enter a report title (e.g. Blood test — March 2026)')

      return

    }

    if (!files?.length) {

      toast.warn('Select at least one image or PDF')

      return

    }

    setUploading(true)

    try {

      const form = new FormData()

      form.append('title', title.trim())

      if (description.trim()) form.append('description', description.trim())

      for (let i = 0; i < files.length; i++) {

        form.append('files', files[i])

      }

      await api.post('/history/my/reports', form, {

        headers: { 'Content-Type': 'multipart/form-data' },

      })

      toast.success('Lab report uploaded')

      setTitle('')

      setDescription('')

      setFiles(null)

      e.target.reset?.()

      load()

    } catch (err) {

      toast.error(err.response?.data?.message || err.message || 'Upload failed')

    } finally {

      setUploading(false)

    }

  }



  return (
    <div className="w-full pb-10">
      <div className="dh-portal-panel mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-5 py-6 text-white sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Clinical records</p>
          <h1 className="mt-1 font-display text-xl font-semibold sm:text-2xl">Medical history</h1>
          <p className="mt-2 text-sm text-teal-100">
            Your protected visit timeline and uploaded lab reports — managed by hospital staff.
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(280px,380px)_1fr]">
        <section className="dh-portal-panel h-fit border-teal-100/80 bg-gradient-to-br from-teal-50/50 to-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-lg text-white shadow-md shadow-teal-600/25">
            📄
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">Upload lab report</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Share blood tests, X-rays, or reports with your doctors. Uploads cannot be deleted (per
            platform policy).
          </p>
          <form onSubmit={uploadReport} className="mt-5 space-y-3">
            <input
              required
              className="dh-input"
              placeholder="Report title (e.g. CBC — May 2026)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="dh-textarea min-h-[88px]"
              placeholder="Optional notes for your doctor"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-700"
              onChange={(e) => setFiles(e.target.files)}
            />
            <button type="submit" disabled={uploading} className="dh-btn w-full">
              {uploading ? 'Uploading…' : 'Upload report'}
            </button>
          </form>
        </section>

        <section className="min-w-0">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Timeline
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/80" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="dh-portal-panel px-8 py-14 text-center">
              <p className="font-display text-lg font-semibold text-slate-900">No medical history yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                After your doctor saves a record from a confirmed appointment, it will appear here.
                You can also upload lab reports on the left.
              </p>
            </div>
          ) : (
            <div className="relative space-y-4 border-l-2 border-teal-200/80 pl-6">
              {history.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} onDownloadPdf={downloadPdf} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )

}



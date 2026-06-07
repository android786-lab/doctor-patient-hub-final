import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import Loader from '../../components/shared/Loader.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function Prescriptions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/patient/prescriptions')
        setItems(Array.isArray(data.prescriptions) ? data.prescriptions : [])
      } catch (err) {
        setItems([])
        setError(err.message || 'Failed to load prescriptions')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="pb-12">
      <div className="dh-portal-panel mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-5 py-6 text-white sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Pharmacy records</p>
          <h1 className="mt-1 font-display text-xl font-semibold sm:text-2xl">E-prescriptions</h1>
          <p className="mt-2 text-sm text-teal-100">
            Medicines prescribed by your doctor after confirmed visits — read-only hospital record.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <span className="font-semibold">Clinical note:</span> Prescriptions cannot be edited once issued by
        your doctor.
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <div className="dh-portal-panel px-6 py-14 text-center">
          <p className="text-3xl">💊</p>
          <p className="mt-3 font-display text-lg font-semibold text-slate-900">No prescriptions yet</p>
          <p className="mt-2 text-sm text-slate-500">They appear here after a completed hospital visit.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((rx) => (
            <li key={rx.id} className="dh-rx-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg">
                    Rx
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{rx.medicine_name}</p>
                    <p className="text-sm text-teal-700">Dr. {rx.doctor_name || '—'}</p>
                  </div>
                </div>
                <time className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {formatDate(rx.visit_date || rx.created_at)}
                </time>
              </div>
              {(rx.dosage || rx.duration) && (
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Dosage:</span>{' '}
                  {[rx.dosage, rx.duration].filter((x) => x && x !== '—').join(' · ')}
                </p>
              )}
              {rx.diagnosis && (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Diagnosis:</span> {rx.diagnosis}
                </p>
              )}
              {rx.instructions && rx.instructions !== '—' && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{rx.instructions}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

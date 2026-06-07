import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
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
      <PageHeader
        eyebrow="Patient portal"
        title="Prescriptions"
        description="Read-only list of medicines prescribed after your visits."
      />

      <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Prescriptions cannot be edited after they are created by your doctor.
      </p>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader />
        </div>
      ) : error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="dh-card px-6 py-12 text-center text-sm text-slate-500">
          No prescriptions yet. They appear here after a completed visit.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((rx) => (
            <li key={rx.id} className="dh-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{rx.medicine_name}</p>
                  <p className="text-sm text-teal-700">Dr. {rx.doctor_name || '—'}</p>
                </div>
                <time className="text-xs text-slate-500">{formatDate(rx.visit_date || rx.created_at)}</time>
              </div>
              {(rx.dosage || rx.duration) && (
                <p className="mt-2 text-sm text-slate-600">
                  {[rx.dosage, rx.duration].filter((x) => x && x !== '—').join(' · ')}
                </p>
              )}
              {rx.diagnosis && (
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-medium">Diagnosis:</span> {rx.diagnosis}
                </p>
              )}
              {rx.instructions && rx.instructions !== '—' && (
                <p className="mt-2 text-sm text-slate-600">{rx.instructions}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

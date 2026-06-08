import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../../context/AppContext.jsx'
import api from '../../services/api.js'
import DoctorCard from '../../components/doctors/DoctorCard.jsx'
import DoctorCardSkeleton from '../../components/doctors/DoctorCardSkeleton.jsx'
import { DEFAULT_TREATMENTS } from '../../components/doctors/DoctorFilters.jsx'
import { useDoctorCatalog } from '@doctor-hub/hooks/useDoctorCatalog.js'

function EmptyState({ onClear }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-8 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-2xl">
        👨‍⚕️
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-slate-900">No doctors found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Try another name, disease, treatment type, or city.
      </p>
      {onClear && (
        <button type="button" onClick={onClear} className="dh-btn mt-6">
          Clear filters
        </button>
      )}
    </div>
  )
}

export default function FindDoctors() {
  const { backendUrl } = useContext(AppContext)
  const { catalog } = useDoctorCatalog({ apiBase: `${backendUrl}/api` })

  const treatmentOptions = useMemo(() => {
    const fromCatalog = (catalog.treatmentTypes || []).map((t) => ({
      value: t.value,
      label: t.label,
      icon: '⚕',
    }))
    const base = DEFAULT_TREATMENTS.map((t) => ({
      value: t.id,
      label: t.label,
      icon: t.icon,
    }))
    const seen = new Set(base.map((t) => t.value))
    const merged = [...base]
    for (const t of fromCatalog) {
      if (!seen.has(t.value)) {
        seen.add(t.value)
        merged.push(t)
      }
    }
    return merged
  }, [catalog.treatmentTypes])

  const quickTags = useMemo(() => {
    const defaults = ['fever', 'diabetes', 'migraine', 'hypertension']
    const extra = (catalog.diseases || []).filter((d) => !defaults.includes(d)).slice(0, 4)
    return [...defaults, ...extra].slice(0, 8)
  }, [catalog.diseases])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [treatmentType, setTreatmentType] = useState('')
  const [city, setCity] = useState('')
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (search) params.search = search
      if (treatmentType) params.treatment_type = treatmentType
      if (city.trim()) params.city = city.trim()

      const { data } = await api.get('/doctors', { params })
      setDoctors(Array.isArray(data) ? data : [])
    } catch (err) {
      setDoctors([])
      setError(err.message || 'Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [search, treatmentType, city])

  useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  const onSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const clearAll = () => {
    setSearch('')
    setSearchInput('')
    setTreatmentType('')
    setCity('')
  }

  const applyQuickTag = (tag) => {
    setSearchInput(tag)
    setSearch(tag)
  }

  return (
    <div className="w-full pb-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 px-6 py-10 text-white md:px-10 md:py-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-widest text-teal-200">Find care</p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Find doctors</h1>
          <p className="mt-3 max-w-2xl text-sm text-teal-100/90 md:text-base">
            Search by name or disease, filter by treatment system and city — same directory as our
            home page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => applyQuickTag(tag)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur transition hover:bg-white/20"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row">
        <aside className="space-y-5 lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">Smart search</p>
            <form onSubmit={onSearchSubmit}>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Name or disease
              </label>
              <input
                type="search"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-inner focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                placeholder="e.g. fever, Dr. Ali…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="dh-btn mt-3 w-full py-2.5 text-sm">
                Search doctors
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Treatment system</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {treatmentOptions.map((opt) => (
                <button
                  key={opt.value || 'all'}
                  type="button"
                  onClick={() => setTreatmentType(opt.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                    treatmentType === opt.value
                      ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50'
                  }`}
                >
                  <span className="text-sm opacity-80">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">City</p>
            <input
              type="text"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="e.g. Lahore"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            {(search || treatmentType || city) && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {!loading && (
            <p className="mb-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{doctors.length}</span> doctor
              {doctors.length === 1 ? '' : 's'} found
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <DoctorCardSkeleton key={i} />
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {doctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  patientPortal
                />
              ))}
            </div>
          )}

          <p className="mt-10 text-center text-sm text-slate-500">
            <Link to="/patient/dashboard" className="text-teal-700 hover:underline">
              ← Back to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

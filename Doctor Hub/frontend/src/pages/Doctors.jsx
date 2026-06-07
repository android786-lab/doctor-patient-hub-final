import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { AppContext } from '../context/AppContext'
import DoctorCard from '../components/doctors/DoctorCard'
import DoctorCardSkeleton from '../components/doctors/DoctorCardSkeleton'
import DoctorFilters, { DEFAULT_TREATMENTS } from '../components/doctors/DoctorFilters'
import SortBar from '../components/doctors/SortBar'
import { useDoctorCatalog } from '../../../shared/hooks/useDoctorCatalog.js'

export default function Doctors() {
  const { speciality: routeSpeciality } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const { catalog } = useDoctorCatalog({ apiBase: `${backendUrl}/api` })

  const treatmentFilters = useMemo(() => {
    const fromCatalog = (catalog.treatmentTypes || []).map((t) => ({
      id: t.value,
      label: t.label,
      icon: '⚕',
    }))
    const seen = new Set(DEFAULT_TREATMENTS.map((t) => t.id))
    const merged = [...DEFAULT_TREATMENTS]
    for (const t of fromCatalog) {
      if (!seen.has(t.id)) {
        seen.add(t.id)
        merged.push(t)
      }
    }
    return merged
  }, [catalog.treatmentTypes])

  const quickDiseaseTags = useMemo(() => {
    const defaults = ['diabetes', 'fever', 'migraine', 'hypertension']
    const extra = (catalog.diseases || []).filter((d) => !defaults.includes(d)).slice(0, 4)
    return [...defaults, ...extra].slice(0, 8)
  }, [catalog.diseases])

  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [disease, setDisease] = useState(searchParams.get('disease') || '')
  const [treatment, setTreatment] = useState(searchParams.get('treatment') || '')
  const [sortBy, setSortBy] = useState('name')

  const speciality = routeSpeciality ? decodeURIComponent(routeSpeciality) : ''

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (treatment) params.set('treatment', treatment)
        if (disease) params.set('disease', disease)
        if (speciality) params.set('speciality', speciality)
        const { data } = await axios.get(`${backendUrl}/api/doctor/list?${params.toString()}`)
        if (data.success) setDoctors(data.doctors ?? [])
        else setDoctors([])
      } catch (e) {
        console.error(e)
        setDoctors([])
      } finally {
        setLoading(false)
      }
    }
    if (backendUrl) load()
  }, [backendUrl, treatment, disease, speciality])

  const sortedDoctors = useMemo(() => {
    const list = [...doctors]
    if (sortBy === 'fees-low') list.sort((a, b) => a.fees - b.fees)
    else if (sortBy === 'fees-high') list.sort((a, b) => b.fees - a.fees)
    else if (sortBy === 'available') list.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0))
    else list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [doctors, sortBy])

  const title = useMemo(() => {
    if (speciality) return `${speciality}`
    if (disease) return `Doctors for "${disease}"`
    if (treatment) return `${treatment.charAt(0).toUpperCase() + treatment.slice(1)} care`
    return 'Find your doctor'
  }, [speciality, treatment, disease])

  const applyDisease = () => {
    const next = new URLSearchParams()
    if (disease) next.set('disease', disease)
    if (treatment) next.set('treatment', treatment)
    setSearchParams(next)
    if (speciality) {
      navigate(`/doctors/${encodeURIComponent(speciality)}?${next.toString()}`)
    } else {
      navigate(`/doctors?${next.toString()}`)
    }
  }

  const clearAll = () => {
    setDisease('')
    setTreatment('')
    setSearchParams({})
    navigate('/doctors')
  }

  const goSpeciality = (s) => {
    const q = new URLSearchParams()
    if (disease) q.set('disease', disease)
    if (treatment) q.set('treatment', treatment)
    const qs = q.toString()
    if (s) navigate(`/doctors/${encodeURIComponent(s)}${qs ? `?${qs}` : ''}`)
    else navigate(`/doctors${qs ? `?${qs}` : ''}`)
  }

  const activeFilters = [disease, treatment, speciality].filter(Boolean).length

  return (
    <div className="w-full pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 px-6 py-10 text-white md:px-10 md:py-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-widest text-teal-200">
            Doctor directory
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-teal-100/90 md:text-base">
            Browse verified specialists by disease, treatment type, or speciality. Book a slot and
            pay securely through Doctor Hub.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {quickDiseaseTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setDisease(tag)
                  setSearchParams({ disease: tag, ...(treatment ? { treatment } : {}) })
                }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur transition hover:bg-white/20"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row">
        <DoctorFilters
          disease={disease}
          setDisease={setDisease}
          treatment={treatment}
          setTreatment={setTreatment}
          speciality={speciality}
          onApplyDisease={applyDisease}
          onClearAll={clearAll}
          onSpeciality={goSpeciality}
          resultCount={loading ? undefined : sortedDoctors.length}
          specialities={catalog.specialities}
          treatments={treatmentFilters}
          diseaseSuggestions={catalog.diseases}
        />

        <div className="min-w-0 flex-1">
          <SortBar
            value={sortBy}
            onChange={setSortBy}
            resultCount={loading ? undefined : sortedDoctors.length}
            activeFilters={activeFilters}
          />

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <DoctorCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedDoctors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-8 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-2xl">
                👨‍⚕️
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold text-slate-900">
                No doctors match your filters
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Add doctors from the{' '}
                <a
                  href={import.meta.env.VITE_ADMIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-teal-700 hover:underline"
                >
                  Staff Portal
                </a>{' '}
                → Add Doctor. Use comma-separated diseases (e.g. diabetes, fever).
              </p>
              <button type="button" onClick={clearAll} className="dh-btn mt-6">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {sortedDoctors.map((doc) => (
                <DoctorCard key={doc.id} doctor={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

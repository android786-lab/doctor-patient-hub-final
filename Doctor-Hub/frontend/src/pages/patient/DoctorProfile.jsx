import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api.js'
import Loader from '../../components/shared/Loader.jsx'

import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'

function formatTimings(timings) {
  if (!timings || typeof timings !== 'object') return 'Contact clinic for hours'
  if (Array.isArray(timings)) return timings.join(', ')
  return Object.entries(timings)
    .map(([day, hours]) => `${day}: ${hours}`)
    .join(' · ')
}

function treatmentLabel(type) {
  if (!type) return '—'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export default function DoctorProfile() {
  const { id } = useParams()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/doctors/${id}`)
        setDoctor(data)
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Doctor not found')
        setDoctor(null)
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600">{error || 'Doctor not found'}</p>
        <Link to="/patient/find-doctors" className="dh-btn mt-6 inline-block">
          Back to search
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <Link
        to="/patient/find-doctors"
        className="text-sm font-medium text-teal-700 hover:underline"
      >
        ← All doctors
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-8 p-6 md:grid-cols-[200px_1fr] md:p-10">
          <DoctorPhoto
            src={doctor.profile_image}
            name={doctor.full_name}
            variant="profile"
          />
          <div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase text-teal-800">
              {treatmentLabel(doctor.treatment_type)}
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900">
              {doctor.full_name}
            </h1>
            <p className="mt-1 text-lg text-teal-700">{doctor.specialization || 'Physician'}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {doctor.consultation_fee != null && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                  Fee: Rs {Number(doctor.consultation_fee)}
                </span>
              )}
              {doctor.experience_years != null && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {doctor.experience_years} years experience
                </span>
              )}
              {doctor.rating != null && (
                <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                  ★ {Number(doctor.rating).toFixed(1)}
                </span>
              )}
            </div>
            {doctor.bio && (
              <p className="mt-4 text-slate-600 leading-relaxed">{doctor.bio}</p>
            )}
            <Link
              to={`/patient/book/${doctor.id}`}
              className="dh-btn mt-8 inline-block px-10 py-3 text-base"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-slate-900">Clinics</h2>
        {doctor.clinics?.length ? (
          <ul className="mt-4 space-y-4">
            {doctor.clinics.map((clinic, i) => (
              <li key={i} className="dh-card p-5">
                <h3 className="font-semibold text-slate-900">{clinic.name || 'Clinic'}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {[clinic.address, clinic.city].filter(Boolean).join(', ') || 'Address on request'}
                </p>
                {clinic.timings && (
                  <p className="mt-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">Timings: </span>
                    {formatTimings(clinic.timings)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-slate-500">No clinic locations listed yet.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-slate-900">Weekly schedule</h2>
        {doctor.weekly_schedule && Object.keys(doctor.weekly_schedule).length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(doctor.weekly_schedule).map(([day, rule]) => (
              <li key={day} className="dh-card px-4 py-3 text-sm">
                <span className="font-semibold uppercase text-slate-800">{day}</span>
                {rule?.enabled === false ? (
                  <span className="ml-2 text-slate-400">Closed</span>
                ) : (
                  <span className="ml-2 text-slate-600">
                    {rule?.start || '10:00'} – {rule?.end || '21:00'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-slate-500">Schedule shown when booking — contact clinic for hours.</p>
        )}
        {doctor.date_schedules?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">Special dates</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {doctor.date_schedules.slice(0, 7).map((ds, i) => (
                <li key={i}>
                  {ds.date}: {ds.enabled === false ? 'Unavailable' : `${ds.start || '—'} – ${ds.end || '—'}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-10 text-center">
        <Link to={`/patient/book/${doctor.id}`} className="dh-btn px-12 py-3.5 text-base">
          Book Appointment
        </Link>
      </div>
    </div>
  )
}

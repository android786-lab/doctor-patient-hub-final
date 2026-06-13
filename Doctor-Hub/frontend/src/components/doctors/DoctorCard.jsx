import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'
import { formatMoney } from '@doctor-hub/constants/currency.js'

function StarRating({ experience }) {
  const years = parseInt(String(experience), 10) || 0
  const score = Math.min(5, 3.5 + Math.min(years, 15) * 0.1)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-amber-400">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`h-3.5 w-3.5 ${i <= Math.round(score) ? 'fill-current' : 'fill-slate-200'}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-medium text-slate-600">{score.toFixed(1)}</span>
    </div>
  )
}

function locationLabel(address, clinics) {
  if (address) {
    if (typeof address === 'string') return address
    return address.line1 || address.city || null
  }
  const city = clinics?.find((c) => c.city)?.city || clinics?.[0]?.city
  return city || null
}

/** Map public + patient API shapes to card fields */
export function normalizeDoctorForCard(raw) {
  const years = raw.experience_years ?? (parseInt(String(raw.experience), 10) || 0)
  return {
    ...raw,
    id: raw.id,
    name: raw.name || raw.full_name,
    speciality: raw.speciality || raw.specialization || 'General practice',
    fees: Number(raw.fees ?? raw.consultation_fee ?? 0),
    image: raw.image || raw.profile_image,
    experience: raw.experience || (years ? `${years} years` : null),
    available: raw.available !== false && raw.is_active !== false,
    diseases: raw.diseases || [],
    degree: raw.degree || raw.bio || null,
    address: raw.address || locationLabel(null, raw.clinics),
    treatment_type: raw.treatment_type
      ? String(raw.treatment_type).charAt(0).toUpperCase() + String(raw.treatment_type).slice(1)
      : null,
  }
}

function DoctorCard({ doctor: rawDoctor, patientPortal = false }) {
  const navigate = useNavigate()
  const doctor = normalizeDoctorForCard(rawDoctor)
  const loc = locationLabel(doctor.address, rawDoctor.clinics)
  const diseases = (doctor.diseases || []).slice(0, 3)
  const moreDiseases = (doctor.diseases?.length || 0) - diseases.length
  const photoSrc = doctor.image

  const goBook = () => {
    const path = patientPortal ? `/patient/book/${doctor.id}` : `/appointment/${doctor.id}`
    navigate(path)
    window.scrollTo(0, 0)
  }

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl">
      <DoctorPhoto src={photoSrc} name={doctor.name} alt={doctor.name} variant="card">
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-slate-900/55 via-slate-900/5 to-transparent" />
        {doctor.treatment_type && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800 shadow-sm">
            {doctor.treatment_type}
          </span>
        )}
        <span
          className={`absolute bottom-3 left-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${
            doctor.available ? 'bg-emerald-500 text-white' : 'bg-slate-700/90 text-white'
          }`}
        >
          {doctor.available ? '● Available today' : 'Fully booked'}
        </span>
      </DoctorPhoto>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-slate-900">{doctor.name}</h3>
            <p className="text-xs font-medium text-teal-700">{doctor.speciality}</p>
          </div>
          <StarRating experience={doctor.experience} />
        </div>

        {doctor.degree && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {doctor.degree}
            {doctor.experience ? ` · ${doctor.experience}` : ''}
          </p>
        )}

        {loc && (
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            <span className="truncate">{loc}</span>
          </p>
        )}

        {diseases.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {diseases.map((d) => (
              <span
                key={d}
                className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600"
              >
                {d}
              </span>
            ))}
            {moreDiseases > 0 && (
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                +{moreDiseases} more
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Consultation fee
            </p>
            <p className="text-xl font-bold text-slate-900">
              {formatMoney(doctor.fees)}
            </p>
          </div>
          <button
            type="button"
            onClick={goBook}
            disabled={!doctor.available}
            className="rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/20 transition hover:from-teal-700 hover:to-teal-800 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            Book slot
          </button>
        </div>
      </div>
    </article>
  )
}

export default memo(DoctorCard)

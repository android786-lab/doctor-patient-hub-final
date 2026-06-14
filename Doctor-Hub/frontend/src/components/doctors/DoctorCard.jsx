import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'
import { formatMoney } from '@doctor-hub/constants/currency.js'

function StarRating({ experience }) {
  const years = parseInt(String(experience), 10) || 0
  const score = Math.min(5, 3.5 + Math.min(years, 15) * 0.1)

  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="flex text-amber-400">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`h-3 w-3 ${i <= Math.round(score) ? 'fill-current' : 'fill-slate-200'}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-[10px] font-medium text-slate-500">{score.toFixed(1)}</span>
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
    degree: raw.degree || null,
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
  const diseases = (doctor.diseases || []).slice(0, 2)
  const moreDiseases = (doctor.diseases?.length || 0) - diseases.length
  const photoSrc = doctor.image

  const goBook = () => {
    const path = patientPortal ? `/patient/book/${doctor.id}` : `/appointment/${doctor.id}`
    navigate(path)
    window.scrollTo(0, 0)
  }

  const metaLine = [doctor.degree, doctor.experience].filter(Boolean).join(' · ')

  return (
    <article className="group flex gap-2.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm transition duration-200 hover:border-teal-200 hover:shadow-md sm:gap-3 sm:p-3">
      <DoctorPhoto
        src={photoSrc}
        name={doctor.name}
        alt={doctor.name}
        variant="card-inline"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold leading-tight text-slate-900 sm:text-[0.9375rem]">
              {doctor.name}
            </h3>
            <p className="truncate text-[11px] font-medium text-teal-700 sm:text-xs">{doctor.speciality}</p>
          </div>
          <StarRating experience={doctor.experience} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {doctor.treatment_type && (
            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-800">
              {doctor.treatment_type}
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
              doctor.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {doctor.available ? 'Available' : 'Booked'}
          </span>
        </div>

        {metaLine && (
          <p className="mt-1 line-clamp-1 text-[10px] text-slate-500 sm:text-[11px]">{metaLine}</p>
        )}

        {loc && (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500 sm:text-[11px]">{loc}</p>
        )}

        {diseases.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {diseases.map((d) => (
              <span
                key={d}
                className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium capitalize text-slate-600"
              >
                {d}
              </span>
            ))}
            {moreDiseases > 0 && (
              <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700">
                +{moreDiseases}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Fee</p>
            <p className="text-base font-bold leading-none text-slate-900 sm:text-lg">
              {formatMoney(doctor.fees)}
            </p>
          </div>
          <button
            type="button"
            onClick={goBook}
            disabled={!doctor.available}
            className="shrink-0 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-teal-700 disabled:bg-slate-300 sm:px-3 sm:py-2 sm:text-xs"
          >
            Book slot
          </button>
        </div>
      </div>
    </article>
  )
}

export default memo(DoctorCard)

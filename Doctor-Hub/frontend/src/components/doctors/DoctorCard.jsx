import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'
import { formatMoney } from '@doctor-hub/constants/currency.js'

function displayDoctorName(name) {
  const n = (name || 'Doctor').trim()
  if (/^dr\.?\s/i.test(n)) return n
  return `Dr. ${n}`
}

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
      <span className="text-[10px] font-semibold text-slate-500">{score.toFixed(1)}</span>
    </div>
  )
}

function locationLabel(address, clinics) {
  if (address) {
    if (typeof address === 'string') return address
    return address.line1 || address.city || null
  }
  return clinics?.find((c) => c.city)?.city || clinics?.[0]?.city || null
}

function MetaRow({ icon, children }) {
  if (!children) return null
  return (
    <li className="flex items-start gap-2 text-[11px] leading-snug text-slate-600 sm:text-xs">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 [&>svg]:h-3 [&>svg]:w-3">
        {icon}
      </span>
      <span className="min-w-0 line-clamp-2">{children}</span>
    </li>
  )
}

const icons = {
  degree: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  location: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  status: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
}

/** Map public + patient API shapes to card fields */
export function normalizeDoctorForCard(raw) {
  const years = raw.experience_years ?? (parseInt(String(raw.experience), 10) || 0)
  return {
    ...raw,
    id: raw.id,
    name: raw.name || raw.full_name,
    speciality: raw.speciality || raw.specialization || 'General physician',
    fees: Number(raw.fees ?? raw.consultation_fee ?? 0),
    image: raw.image || raw.profile_image,
    experience: raw.experience || (years ? `${years} Year${years === 1 ? '' : 's'}` : null),
    available: raw.available !== false && raw.is_active !== false,
    diseases: raw.diseases || [],
    degree: raw.degree || 'MBBS',
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

  const goBook = () => {
    const path = patientPortal ? `/patient/book/${doctor.id}` : `/appointment/${doctor.id}`
    navigate(path)
    window.scrollTo(0, 0)
  }

  const qualification = [doctor.degree, doctor.experience].filter(Boolean).join(' · ')

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <div className="flex flex-row items-start gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Info — left */}
        <div className="min-w-0 flex-1 basis-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-sm font-bold text-slate-900 sm:text-base">
                {displayDoctorName(doctor.name)}
              </h3>
              <p className="mt-0.5 truncate text-xs font-semibold text-teal-700">{doctor.speciality}</p>
              <div className="mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-teal-500 to-teal-300" />
            </div>
            <StarRating experience={doctor.experience} />
          </div>

          <ul className="mt-2 space-y-1.5">
            {qualification && <MetaRow icon={icons.degree}>{qualification}</MetaRow>}
            {loc && <MetaRow icon={icons.location}>{loc}</MetaRow>}
            <MetaRow icon={icons.status}>
              {doctor.available ? 'Available for booking' : 'Fully booked'}
            </MetaRow>
          </ul>

          {(doctor.treatment_type || diseases.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {doctor.treatment_type && (
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
                  {doctor.treatment_type}
                </span>
              )}
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
                  +{moreDiseases}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fee</p>
              <p className="font-display text-lg font-bold text-slate-900">{formatMoney(doctor.fees)}</p>
            </div>
            <button
              type="button"
              onClick={goBook}
              disabled={!doctor.available}
              className="shrink-0 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              Book slot
            </button>
          </div>
        </div>

        {/* Photo — fixed square, right side */}
        <div className="relative flex-none shrink-0 self-start">
          <span
            className="pointer-events-none absolute -left-0.5 -top-0.5 z-10 h-6 w-6 rounded-tl-lg border-l-[3px] border-t-[3px] border-teal-500"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -bottom-0.5 -right-0.5 z-10 h-6 w-6 rounded-br-lg border-b-[3px] border-r-[3px] border-teal-500"
            aria-hidden
          />
          <DoctorPhoto
            src={doctor.image}
            name={doctor.name}
            alt={doctor.name}
            variant="card-portrait"
          />
        </div>
      </div>
    </article>
  )
}

export default memo(DoctorCard)

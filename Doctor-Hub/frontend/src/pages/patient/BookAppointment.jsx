import { useContext, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'
import { AppContext } from '../../context/AppContext.jsx'
import api from '../../services/api.js'
import Loader from '../../components/shared/Loader.jsx'
import ManualPaymentProofForm from '../../components/patient/ManualPaymentProofForm.jsx'

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const STEPS = [
  { id: 'clinic', label: 'Clinic', short: 'Where' },
  { id: 'slot', label: 'Date & time', short: 'When' },
  { id: 'confirm', label: 'Confirm', short: 'Review' },
  { id: 'payment', label: 'Payment', short: 'Pay' },
]

const DEFAULT_CLINIC_ID = 'default'

function formatAddress(addr) {
  if (!addr) return null
  if (typeof addr === 'string') return addr.trim() || null
  const parts = [addr.line1, addr.line2, addr.city].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

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

function BookingProgress({ step }) {
  return (
    <nav aria-label="Booking progress" className="mt-6">
      <ol className="flex items-center gap-0 sm:gap-1">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 transition ${
                    done
                      ? 'bg-teal-600 text-white ring-teal-600'
                      : active
                        ? 'bg-teal-600 text-white ring-teal-200 shadow-md shadow-teal-600/30'
                        : 'bg-white text-slate-400 ring-slate-200'
                  }`}
                >
                  {done ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="hidden text-center sm:block">
                  <span
                    className={`block text-xs font-semibold ${active ? 'text-teal-800' : done ? 'text-slate-700' : 'text-slate-400'}`}
                  >
                    {s.label}
                  </span>
                  <span className="block text-[10px] text-slate-400">{s.short}</span>
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={`mx-1 hidden h-0.5 flex-1 sm:block ${done ? 'bg-teal-500' : 'bg-slate-200'}`}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-center text-sm font-medium text-slate-600 sm:hidden">
        Step {step + 1} of {STEPS.length}: <span className="text-teal-800">{STEPS[step].label}</span>
      </p>
    </nav>
  )
}

function DoctorSummaryAside({ docInfo, formatMoney }) {
  const location = formatAddress(docInfo.address)
  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:sticky lg:top-24">
      <div className="relative">
        <DoctorPhoto src={docInfo.image} name={docInfo.name} variant="card" className="aspect-[4/3] w-full">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
          <span
            className={`absolute bottom-3 left-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${
              docInfo.available ? 'bg-emerald-500 text-white' : 'bg-slate-700/90 text-white'
            }`}
          >
            {docInfo.available ? '● Available' : 'Fully booked'}
          </span>
        </DoctorPhoto>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-slate-900">{docInfo.name}</h2>
            <p className="text-sm font-medium text-teal-700">{docInfo.speciality}</p>
          </div>
          <StarRating experience={docInfo.experience} />
        </div>
        {docInfo.degree ? (
          <p className="mt-2 text-xs text-slate-500">
            {docInfo.degree}
            {docInfo.experience ? ` · ${docInfo.experience}` : ''}
          </p>
        ) : null}
        {location ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-600">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="line-clamp-2">{location}</span>
          </p>
        ) : null}
        <div className="mt-4 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50/80 p-4 ring-1 ring-teal-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-800">Consultation fee</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">{formatMoney(docInfo.fees)}</p>
          <p className="mt-1 text-xs text-slate-500">Pay now to confirm your booking</p>
        </div>
      </div>
    </aside>
  )
}

function StepHeader({ step, title, description }) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
        Step {step} — {title}
      </p>
      {description ? <p className="mt-2 max-w-xl text-sm text-slate-600">{description}</p> : null}
    </div>
  )
}

function ClinicOptionCard({ active, onClick, title, subtitle, badge, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition ${
        active
          ? 'border-teal-600 bg-teal-50/80 shadow-md ring-2 ring-teal-600/20'
          : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg ${
          active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{title}</span>
          {badge ? (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-800">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-600">{subtitle}</span>
      </span>
      <span
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
        }`}
      >
        {active ? (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </span>
    </button>
  )
}

function mapDoctorForBooking(raw) {
  if (!raw) return null
  const years = raw.experience_years ?? parseInt(String(raw.experience || ''), 10)
  return {
    id: raw.id,
    name: raw.full_name || raw.name,
    image: raw.profile_image || raw.image,
    speciality: raw.specialization || raw.speciality || 'General physician',
    degree: raw.degree || 'MBBS',
    experience:
      raw.experience ||
      (years ? `${years} Year${years === 1 ? '' : 's'}` : '—'),
    about: raw.bio || raw.about || '',
    fees: Number(raw.consultation_fee ?? raw.fees ?? 0),
    address: raw.address || null,
    treatment_type: raw.treatment_type || null,
    available: raw.available !== false && raw.is_active !== false,
    slots_booked: raw.slots_booked || {},
    weekly_schedule: raw.weekly_schedule || {},
    slot_duration_minutes: raw.slot_duration_minutes || 30,
    clinics: (raw.clinics || []).map((c, i) => ({
      id: c.id || `clinic-${i}`,
      name: c.name || `Clinic ${i + 1}`,
      address: c.address,
      city: c.city,
      timings: c.timings,
    })),
  }
}

function timeToMinutes(timeStr) {
  const match = String(timeStr || '10:00').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return 10 * 60
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function buildSlots(docInfo) {
  if (!docInfo || docInfo.available === false) return []

  const today = new Date()
  const schedule = docInfo.weekly_schedule || {}
  const slotMinutes = docInfo.slot_duration_minutes || 30
  const result = []

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(today)
    dayStart.setDate(today.getDate() + i)
    dayStart.setHours(0, 0, 0, 0)

    const dayKey = DAY_KEYS[dayStart.getDay()]
    const dayRule = schedule[dayKey] || { enabled: true, start: '10:00', end: '21:00' }

    if (dayRule.enabled === false) {
      result.push([])
      continue
    }

    const startMin = timeToMinutes(dayRule.start)
    const endMin = timeToMinutes(dayRule.end)
    const cursor = new Date(dayStart)
    cursor.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0)
    const endTime = new Date(dayStart)
    endTime.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0)

    if (i === 0) {
      const now = new Date()
      if (cursor < now) {
        const bump = new Date(now)
        bump.setMinutes(bump.getMinutes() + (slotMinutes - (bump.getMinutes() % slotMinutes)))
        if (bump > cursor) cursor.setTime(bump.getTime())
      }
    }

    const times = []
    while (cursor < endTime) {
      const formattedTime = cursor.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      const slotDate = `${cursor.getDate()}_${cursor.getMonth() + 1}_${cursor.getFullYear()}`
      const booked = docInfo.slots_booked?.[slotDate]?.includes(formattedTime)
      if (!booked) {
        times.push({ datetime: new Date(cursor), time: formattedTime })
      }
      cursor.setMinutes(cursor.getMinutes() + slotMinutes)
    }
    result.push(times)
  }

  return result
}

async function compressScreenshot(file) {
  if (!file?.type?.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const maxW = 1200
    let w = bitmap.width
    let h = bitmap.height
    if (w > maxW) {
      h = Math.round((h * maxW) / w)
      w = maxW
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.82)
    })
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export default function BookAppointment() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { formatMoney, getDoctorsData } = useContext(AppContext)

  const [loading, setLoading] = useState(true)
  const [docInfo, setDocInfo] = useState(null)
  const [step, setStep] = useState(0)
  const [clinicId, setClinicId] = useState('')
  const [slotIndex, setSlotIndex] = useState(0)
  const [slotTime, setSlotTime] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [diseaseQuery, setDiseaseQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentFile, setPaymentFile] = useState(null)
  const [paymentPreview, setPaymentPreview] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('easypaisa')
  const [paymentReference, setPaymentReference] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data } = await api.get(`/doctors/${docId}`)
        if (!cancelled) {
          setDocInfo(mapDoctorForBooking(data))
          const mapped = mapDoctorForBooking(data)
          const clinics = mapped?.clinics || []
          if (clinics.length === 1) setClinicId(clinics[0].id)
          else if (clinics.length === 0) setClinicId(DEFAULT_CLINIC_ID)
        }
      } catch {
        if (!cancelled) {
          toast.error('Doctor not found')
          setDocInfo(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (docId) load()
    return () => {
      cancelled = true
    }
  }, [docId])

  const docSlots = useMemo(() => (docInfo ? buildSlots(docInfo) : []), [docInfo])
  const selectedClinic = docInfo?.clinics?.find((c) => c.id === clinicId)
  const daySlots = docSlots[slotIndex] || []
  const hasAnySlots = docSlots.some((d) => d.length > 0)

  useEffect(() => {
    setSlotIndex(0)
    setSlotTime('')
  }, [docId])

  useEffect(() => {
    if (daySlots.length && !daySlots.some((s) => s.time === slotTime)) {
      setSlotTime(daySlots[0].time)
    }
  }, [docSlots, slotIndex, slotTime])

  const slotDateIso = () => {
    const date = daySlots[0]?.datetime || docSlots[slotIndex]?.[0]?.datetime
    if (!date) return null
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const completeBookingWithPayment = async () => {
    const dateIso = slotDateIso()
    if (!clinicId) {
      toast.warning('Select a clinic or location')
      return
    }
    if (!slotTime || !dateIso) {
      toast.warning('Select a date and time slot')
      return
    }
    if (!paymentFile) {
      toast.warning('Upload a payment screenshot to complete booking')
      return
    }

    setSubmitting(true)
    let createdAppointmentId = null
    try {
      const { data: bookData } = await api.post('/appointments', {
        doctorId: docId,
        clinicId:
          clinicId === DEFAULT_CLINIC_ID || String(clinicId).startsWith('clinic-') ? null : clinicId,
        date: dateIso,
        timeSlot: slotTime,
        symptoms,
        diseaseQuery,
      })

      if (!bookData?.success || !bookData.appointmentId) {
        toast.error(bookData?.message || 'Booking failed')
        return
      }

      createdAppointmentId = bookData.appointmentId
      const compressed = await compressScreenshot(paymentFile)
      const form = new FormData()
      form.append('appointmentId', createdAppointmentId)
      form.append('paymentMethod', paymentMethod)
      if (paymentReference.trim()) form.append('reference', paymentReference.trim())
      form.append('screenshot', compressed)

      const { data: payData } = await api.post('/payments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      })

      if (payData?.success) {
        toast.success(
          payData.message || 'Booking submitted — we will verify your payment and confirm your slot'
        )
        getDoctorsData?.()
        navigate('/patient/appointments', { replace: true })
      } else {
        toast.error(payData?.message || 'Payment upload failed')
        try {
          await api.post('/user/cancel-appointment', { appointmentId: createdAppointmentId })
        } catch {
          /* best effort */
        }
      }
    } catch (error) {
      toast.error(error.message || 'Could not complete booking')
      if (createdAppointmentId) {
        try {
          await api.post('/user/cancel-appointment', { appointmentId: createdAppointmentId })
        } catch {
          /* best effort */
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onPaymentFile = (e) => {
    const f = e.target.files?.[0]
    setPaymentFile(f || null)
    if (paymentPreview) URL.revokeObjectURL(paymentPreview)
    setPaymentPreview(f ? URL.createObjectURL(f) : '')
  }

  const canNext = () => {
    if (step === 0) return !!clinicId || (docInfo?.clinics?.length === 0)
    if (step === 1) return !!slotTime && daySlots.length > 0
    return true
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!docInfo) {
    return (
      <div className="dh-page text-center">
        <p className="text-slate-600">Doctor not found.</p>
        <Link to="/patient/find-doctors" className="dh-btn mt-6 inline-block">
          Find doctors
        </Link>
      </div>
    )
  }

  const defaultLocationLabel =
    formatAddress(docInfo.address) || 'Doctor will share exact location after confirmation'
  const hasClinics = (docInfo.clinics?.length || 0) > 0

  return (
    <div className="pb-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 px-6 py-8 text-white md:px-10">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
        <Link
          to={`/patient/doctor/${docId}`}
          className="relative inline-flex items-center gap-1 text-sm font-medium text-teal-100 hover:text-white"
        >
          ← Back to profile
        </Link>
        <div className="relative mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">Book appointment</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Dr. {docInfo.name}</h1>
          <p className="mt-2 text-sm text-teal-100/90">
            {docInfo.speciality}
            {docInfo.treatment_type
              ? ` · ${String(docInfo.treatment_type).charAt(0).toUpperCase()}${String(docInfo.treatment_type).slice(1)}`
              : ''}
          </p>
        </div>
      </div>

      <BookingProgress step={step} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:gap-8">
        <DoctorSummaryAside docInfo={docInfo} formatMoney={formatMoney} />

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex-1 p-6 sm:p-8">
            {step === 0 && (
              <div className="space-y-6">
                <StepHeader
                  step={1}
                  title="Choose location"
                  description="Select where you want to meet the doctor. You can continue with the default location if no clinic is listed."
                />
                <div className="space-y-3">
                  {!hasClinics ? (
                    <ClinicOptionCard
                      active={clinicId === DEFAULT_CLINIC_ID}
                      onClick={() => setClinicId(DEFAULT_CLINIC_ID)}
                      icon="📍"
                      title="Default consultation location"
                      badge="Recommended"
                      subtitle={defaultLocationLabel}
                    />
                  ) : null}
                  {docInfo.clinics.map((clinic) => (
                    <ClinicOptionCard
                      key={clinic.id}
                      active={clinicId === clinic.id}
                      onClick={() => setClinicId(clinic.id)}
                      icon="🏥"
                      title={clinic.name}
                      subtitle={
                        [clinic.address, clinic.city].filter(Boolean).join(', ') ||
                        'Address shared after booking'
                      }
                    />
                  ))}
                </div>
                {!hasClinics && clinicId === DEFAULT_CLINIC_ID ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100">
                    This doctor has not added separate clinics yet. Your booking uses their primary
                    practice location.
                  </p>
                ) : null}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <StepHeader
                  step={2}
                  title="Pick date & time"
                  description="Choose an available slot in the next 7 days. Times are shown in your local timezone."
                />
                {!hasAnySlots ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                    <p className="text-3xl">📅</p>
                    <p className="mt-3 font-semibold text-slate-900">No slots this week</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Try another doctor or check back when the schedule opens.
                    </p>
                    <Link to="/patient/find-doctors" className="dh-btn mt-6 inline-block text-sm">
                      Find other doctors
                    </Link>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {docSlots.map((slots, index) => {
                          const d = slots[0]?.datetime
                          const disabled = !slots.length
                          const active = slotIndex === index
                          const isToday = index === 0
                          return (
                            <button
                              key={index}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setSlotIndex(index)
                                setSlotTime('')
                              }}
                              className={`flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-3 text-center transition ${
                                disabled
                                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                                  : active
                                    ? 'border-teal-600 bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50'
                              }`}
                            >
                              {isToday && !disabled ? (
                                <span className="mb-0.5 text-[9px] font-bold uppercase opacity-90">Today</span>
                              ) : (
                                <span className="mb-0.5 text-[10px] font-semibold uppercase opacity-70">
                                  {d ? DAYS_SHORT[d.getDay()] : '—'}
                                </span>
                              )}
                              <span className="text-xl font-bold leading-none">{d ? d.getDate() : '·'}</span>
                              <span className="mt-0.5 text-[10px] opacity-80">
                                {d
                                  ? d.toLocaleDateString(undefined, { month: 'short' })
                                  : ''}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Available times
                        {daySlots.length ? (
                          <span className="ml-2 font-normal normal-case text-slate-400">
                            ({daySlots.length} slot{daySlots.length === 1 ? '' : 's'})
                          </span>
                        ) : null}
                      </p>
                      {daySlots.length ? (
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map((item) => {
                            const active = slotTime === item.time
                            return (
                              <button
                                key={item.time}
                                type="button"
                                onClick={() => setSlotTime(item.time)}
                                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                                  active
                                    ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50'
                                }`}
                              >
                                {item.time}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No times left on this day — pick another date.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <StepHeader
                  step={3}
                  title="Review & confirm"
                  description="Check your booking details and tell us why you are visiting."
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: 'Location',
                      value: selectedClinic?.name || 'Default location',
                      icon: '📍',
                    },
                    {
                      label: 'Appointment',
                      value: `${slotDateIso() || '—'} · ${slotTime || '—'}`,
                      icon: '🕐',
                    },
                    { label: 'Fee', value: formatMoney(docInfo.fees), icon: '💳' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                    >
                      <p className="text-lg">{row.icon}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {row.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{row.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Reason for visit
                    <input
                      className="dh-input mt-1.5"
                      placeholder="e.g. knee pain, fever, follow-up"
                      value={diseaseQuery}
                      onChange={(e) => setDiseaseQuery(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Symptoms or notes <span className="font-normal text-slate-400">(optional)</span>
                    <textarea
                      className="dh-input mt-1.5 min-h-[88px]"
                      rows={3}
                      placeholder="Anything the doctor should know before your visit…"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <StepHeader
                  step={4}
                  title="Pay & complete booking"
                  description="Transfer the fee using JazzCash or EasyPaisa, upload proof, then submit. Without payment, your appointment will not be booked."
                />
                <ManualPaymentProofForm
                  fee={docInfo.fees}
                  formatMoney={formatMoney}
                  method={paymentMethod}
                  onMethodChange={setPaymentMethod}
                  reference={paymentReference}
                  onReferenceChange={setPaymentReference}
                  onFileChange={onPaymentFile}
                  preview={paymentPreview}
                  fileName={paymentFile?.name}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
            {step > 0 ? (
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => setStep((s) => s - 1)}
                disabled={submitting}
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <button
                type="button"
                disabled={!canNext()}
                className="dh-btn min-w-[140px] disabled:opacity-50"
                onClick={() => setStep((s) => s + 1)}
              >
                Continue →
              </button>
            ) : step === 2 ? (
              <button
                type="button"
                disabled={submitting || !canNext()}
                className="dh-btn min-w-[160px] disabled:opacity-50"
                onClick={() => setStep(3)}
              >
                Continue to payment →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !paymentFile}
                className="dh-btn min-w-[200px] disabled:opacity-50"
                onClick={completeBookingWithPayment}
              >
                {submitting ? 'Submitting…' : 'Pay & book appointment'}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

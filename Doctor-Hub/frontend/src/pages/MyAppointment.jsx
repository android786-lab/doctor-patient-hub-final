import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import { getAppointmentStatus } from '../utils/appointmentStatus'
import { ROUTES } from '../utils/constants.js'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatSlotDate(slotDate) {
  if (!slotDate) return '—'
  const [day, month, year] = String(slotDate).split('_')
  if (!day || !month || !year) return slotDate
  return `${day} ${MONTHS[Number(month)] || month} ${year}`
}

function formatPersonName(name) {
  return (name || 'Doctor')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function formatAddress(addr) {
  if (!addr) return null
  if (typeof addr === 'string' && addr.trim()) return addr.trim()
  const parts = [addr.line1, addr.line2, addr.city].filter((p) => p && String(p).trim())
  return parts.length ? parts.join(', ') : null
}

function StatusBadge({ label, tone }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-sky-100 text-sky-800',
    red: 'bg-red-100 text-red-800',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.slate}`}
    >
      {label}
    </span>
  )
}

function AppointmentCardSkeleton() {
  return <div className="h-[4.5rem] animate-pulse rounded-xl bg-slate-200" />
}

function AppointmentCard({ item, formatMoney, onCancel }) {
  const st = getAppointmentStatus(item)
  const doc = item.doc_data || {}
  const doctorName = formatPersonName(doc.name)
  const specialty = doc.speciality || doc.specialization || 'General physician'
  const addressLine = formatAddress(doc.address)
  const fee = Number(item.amount ?? doc.fees ?? 0)
  const incompleteBooking = item.status === 'pending_payment' && !item.payment_proof_url
  const when = `${formatSlotDate(item.slot_date)}${item.slot_time ? ` · ${item.slot_time}` : ''}`
  const reason = item.symptoms || item.disease_query
  const metaParts = [
    when,
    fee > 0 ? formatMoney(fee) : null,
    reason || null,
    addressLine || null,
  ].filter(Boolean)

  const hasActions =
    incompleteBooking ||
    (item.status === 'confirmed' && !item.is_completed) ||
    (!item.cancelled && !item.is_completed && item.status !== 'payment_uploaded')

  return (
    <article className="dh-card shadow-sm transition hover:border-teal-200/80">
      <div className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <DoctorPhoto
            src={doc.image}
            name={doctorName}
            variant="appointment"
            className="!h-11 !w-11 !max-h-11 !max-w-11 flex-none"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate text-sm font-semibold text-slate-900">{doctorName}</h2>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <span className="truncate text-xs font-medium text-teal-700">{specialty}</span>
              <StatusBadge label={st.label} tone={st.tone} />
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {metaParts.join(' · ')}
            </p>
          </div>
        </div>

        {hasActions ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 sm:shrink-0 sm:border-0 sm:pt-0">
            {incompleteBooking && (
              <Link
                to={ROUTES.FIND_DOCTORS}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Book again with payment
              </Link>
            )}
            {item.status === 'confirmed' && !item.is_completed && (
              <Link
                to={`/patient/appointments/${item.id}/chat`}
                className="dh-btn rounded-lg px-3 py-1.5 text-xs font-semibold"
                title="Open appointment messages"
              >
                Messages
              </Link>
            )}
            {!item.cancelled &&
              !item.is_completed &&
              item.status !== 'payment_uploaded' &&
              !(item.status === 'awaiting_verification' && item.payment_proof_url) && (
              <button
                type="button"
                onClick={() => onCancel(item.id)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default function MyAppointments() {
  const { backendUrl, token, formatMoney, getDoctorsData } = useContext(AppContext)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const getUserAppointments = async () => {
    setLoading(true)
    try {
      let data
      try {
        const res = await axios.get(`${backendUrl}/api/patient/appointments`, {
          headers: { token, Authorization: `Bearer ${token}` },
        })
        data = res.data
      } catch {
        const res = await axios.get(`${backendUrl}/api/user/appointments`, {
          headers: { token },
        })
        data = res.data
      }
      if (!data?.success && data?.message) {
        toast.error(data.message)
      }
      const list = Array.isArray(data?.appointments) ? data.appointments : []
      setAppointments([...list].reverse())
    } catch (error) {
      console.error(error)
      toast.error(error.message)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { token } }
      )
      if (data.success) {
        toast.success(data.message)
        getUserAppointments()
        getDoctorsData()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (token) getUserAppointments()
    else setLoading(false)
  }, [token])

  return (
    <div className="dh-page-inner">
      <PageHeader
        eyebrow="Patient"
        title="My appointments"
        description="Pay when you book a doctor. After you upload proof, our team verifies payment and confirms your visit."
      />

      <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">1. Book & pay</span>
        <span className="text-slate-300">→</span>
        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
          2. Awaiting verification
        </span>
        <span className="text-slate-300">→</span>
        <span className="rounded-full bg-teal-100 px-3 py-1 font-medium text-teal-800">3. Confirmed</span>
      </div>

      <div className="mt-6 max-w-3xl space-y-2.5">
        {loading ? (
          <>
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
          </>
        ) : appointments.length === 0 ? (
          <div className="dh-card px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold text-slate-900">No appointments yet</p>
            <p className="mt-2 text-sm text-slate-600">
              When you book a doctor and submit payment proof, your visits will show up here.
            </p>
            <Link to={ROUTES.FIND_DOCTORS} className="dh-btn mt-6 inline-block">
              Find a doctor
            </Link>
          </div>
        ) : (
          appointments.map((item) => (
            <AppointmentCard
              key={item.id}
              item={item}
              formatMoney={formatMoney}
              onCancel={cancelAppointment}
            />
          ))
        )}
      </div>
    </div>
  )
}

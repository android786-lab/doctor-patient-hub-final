import supabase from '../config/supabase.js'
import { resolvePatientId } from './medicalHistoryRows.js'
import { insertPatientProfile } from './authUserRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function isMissingRelation(err) {
  return /relation.*does not exist/i.test(err?.message || '')
}

/** CareLink `available` is often absent on module schema; only explicit false blocks booking. */
export function isDoctorAvailableForBooking(doc) {
  if (!doc) return false
  if (doc.is_active === false) return false
  if (doc.available === false) return false
  return true
}

export function doctorBookingFee(doc) {
  const n = Number(doc?.consultation_fee ?? doc?.fees ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Fee from appointment row (CareLink amount / doc_data snapshot). */
export function feeFromAppointmentRow(row) {
  if (!row) return null
  const direct = Number(row.amount)
  if (Number.isFinite(direct) && direct > 0) return direct
  const doc = row.doc_data
  if (doc && typeof doc === 'object') {
    const fromDoc = doctorBookingFee(doc)
    if (fromDoc > 0) return fromDoc
  }
  return null
}

export async function resolveAppointmentPayAmount(appointment) {
  const inline = feeFromAppointmentRow(appointment)
  if (inline) return inline

  const doctorId = appointment?.doc_id || appointment?.doctor_id
  if (!doctorId) return null

  for (const sel of ['consultation_fee, fees', 'fees', 'consultation_fee']) {
    const { data, error } = await supabase.from('doctors').select(sel).eq('id', doctorId).maybeSingle()
    if (error) continue
    const fee = doctorBookingFee(data)
    if (fee > 0) return fee
  }
  return null
}

/** Stripe Checkout `unit_amount` in smallest currency unit (e.g. cents). */
export function stripeUnitAmount(amountMajor) {
  const n = Number(amountMajor)
  if (!Number.isFinite(n) || n <= 0) return null
  const cents = Math.round(n * 100)
  return Number.isFinite(cents) && cents >= 50 ? cents : null
}

export function parseBookingSlot(slotDate, slotTime) {
  const parts = String(slotDate || '').split('_')
  if (parts.length !== 3) {
    throw new Error('Invalid appointment date')
  }
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)
  const base = new Date(year, month, day)

  const timeStr = String(slotTime || '').trim()
  const localeParse = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${timeStr}`)
  if (!Number.isNaN(localeParse.getTime())) {
    return localeParse.toISOString()
  }

  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
  if (m) {
    let h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    const ap = (m[3] || '').toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    base.setHours(h, min, 0, 0)
    return base.toISOString()
  }

  base.setHours(10, 0, 0, 0)
  return base.toISOString()
}

async function loadUserDataForBooking(userId) {
  const attempts = [
    'id, name, email, image, phone, address, gender, dob',
    'id, name, email, image, phone, address',
    'id, name, email',
    'id, email',
  ]
  for (const sel of attempts) {
    const { data, error } = await supabase.from('users').select(sel).eq('id', userId).maybeSingle()
    if (!error && data) {
      return {
        id: data.id,
        name: data.name || data.email?.split('@')[0] || 'Patient',
        email: data.email,
        image: data.image ?? null,
        phone: data.phone,
        address: data.address,
        gender: data.gender,
        dob: data.dob,
      }
    }
    if (error && !isMissingColumn(error)) throw error
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (profile) {
    return {
      id: profile.id,
      name: profile.full_name || profile.email?.split('@')[0] || 'Patient',
      email: profile.email,
      image: profile.avatar_url ?? null,
    }
  }

  return { id: userId, name: 'Patient', email: null, image: null }
}

async function resolveClinicIdForDoctor(doctorRowId) {
  const { data: link, error: linkErr } = await supabase
    .from('doctor_clinics')
    .select('clinic_id')
    .eq('doctor_id', doctorRowId)
    .limit(1)
    .maybeSingle()

  if (!linkErr && link?.clinic_id) return link.clinic_id

  if (!linkErr || isMissingRelation(linkErr)) {
    const { data: direct, error: directErr } = await supabase
      .from('clinics')
      .select('id')
      .eq('doctor_id', doctorRowId)
      .limit(1)
      .maybeSingle()

    if (!directErr && direct?.id) return direct.id
    if (directErr && !isMissingColumn(directErr) && !isMissingRelation(directErr)) throw directErr
  } else if (!isMissingRelation(linkErr)) {
    throw linkErr
  }

  let clinic = null
  let clinicErr = null
  for (const payload of [
    { name: 'Main clinic', address: 'To be updated', city: '—', doctor_id: doctorRowId },
    { name: 'Main clinic', address: 'To be updated', city: '—' },
  ]) {
    const res = await supabase.from('clinics').insert(payload).select('id').single()
    if (!res.error) {
      clinic = res.data
      break
    }
    clinicErr = res.error
    if (!isMissingColumn(res.error)) break
  }

  if (!clinic) throw clinicErr || new Error('Could not resolve clinic for appointment')

  const { error: dcErr } = await supabase.from('doctor_clinics').insert({
    doctor_id: doctorRowId,
    clinic_id: clinic.id,
  })
  if (dcErr && !isMissingRelation(dcErr)) {
    await supabase.from('clinics').update({ doctor_id: doctorRowId }).eq('id', clinic.id)
  }

  return clinic.id
}

async function ensurePatientId(userId, userData) {
  let patientId = await resolvePatientId({ user_id: userId })
  if (patientId) return patientId

  await insertPatientProfile({
    user_id: userId,
    full_name: userData?.name,
    phone: userData?.phone,
  })
  patientId = await resolvePatientId({ user_id: userId })
  if (!patientId) {
    throw new Error('Patient profile not found — please sign out and register again')
  }
  return patientId
}

function stripDoctorForSnapshot(doc) {
  const { slots_booked: _sb, password: _pw, weekly_schedule: _ws, ...safe } = doc
  return safe
}

async function updateSlotsBooked(docId, slots_booked) {
  const { error } = await supabase.from('doctors').update({ slots_booked }).eq('id', docId)
  if (!error) return
  if (isMissingColumn(error)) return
  throw error
}

async function insertAppointmentRow(attempts) {
  let lastError = null
  for (const payload of attempts) {
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && v !== null)
    )
    if (!Object.keys(cleaned).length) continue

    let { error } = await supabase.from('appointments').insert(cleaned)
    if (!error) return

    if (isMissingColumn(error)) {
      lastError = error
      continue
    }
    throw error
  }
  if (lastError) throw lastError
  throw new Error('Could not save appointment')
}

export async function bookAppointmentForPatient({
  userId,
  docId,
  slotDate,
  slotTime,
  symptoms,
  diseaseQuery,
  clinicId: preferredClinicId,
}) {
  const { data: docData, error: docErr } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', docId)
    .single()
  if (docErr) throw docErr

  if (!isDoctorAvailableForBooking(docData)) {
    return { success: false, message: 'Doctor Not Available' }
  }

  const hasSlotsBooked = Object.prototype.hasOwnProperty.call(docData, 'slots_booked')
  const slots_booked = { ...(docData.slots_booked || {}) }
  if (hasSlotsBooked && slots_booked[slotDate]?.includes(slotTime)) {
    return { success: false, message: 'Slot Not Available' }
  }

  const userData = await loadUserDataForBooking(userId)
  const safeDocData = stripDoctorForSnapshot(docData)
  const amount = doctorBookingFee(docData)
  const scheduled_at = parseBookingSlot(slotDate, slotTime)

  const carelinkBase = {
    user_id: userId,
    doc_id: docId,
    slot_date: slotDate,
    slot_time: slotTime,
    user_data: userData,
    doc_data: safeDocData,
    amount,
    date: Date.now(),
    cancelled: false,
    payment: false,
    is_completed: false,
    symptoms: symptoms || null,
    disease_query: diseaseQuery || null,
  }

  const patientId = await ensurePatientId(userId, userData)
  const clinicId = preferredClinicId || (await resolveClinicIdForDoctor(docId))

  const moduleBase = {
    patient_id: patientId,
    doctor_id: docId,
    clinic_id: clinicId,
    scheduled_at,
    amount,
    symptoms: symptoms || null,
    disease_query: diseaseQuery || null,
    status: 'pending_payment',
  }

  await insertAppointmentRow([
    { ...carelinkBase, status: 'pending_payment' },
    carelinkBase,
    { ...moduleBase },
    {
      patient_id: patientId,
      doctor_id: docId,
      clinic_id: clinicId,
      scheduled_at,
      amount,
      status: 'pending_payment',
    },
    {
      patient_id: patientId,
      doctor_id: docId,
      clinic_id: clinicId,
      scheduled_at,
      status: 'pending_payment',
    },
  ])

  if (hasSlotsBooked) {
    slots_booked[slotDate] = [...(slots_booked[slotDate] || []), slotTime]
    await updateSlotsBooked(docId, slots_booked)
  }

  let appointmentId = null
  const { data: latest } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', docId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latest?.id) appointmentId = latest.id
  if (!appointmentId && patientId) {
    const { data: byPatient } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', docId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    appointmentId = byPatient?.id || null
  }

  return {
    success: true,
    message: 'Appointment reserved — payment proof received',
    appointmentId,
  }
}

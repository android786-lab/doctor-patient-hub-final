import supabase from '../config/supabase.js'

/** Columns that exist on 001 + Module 2 schema (no CareLink-only `name`, `image`, …) */
import {
  extractScheduleFromDoctorRow,
  extractSlotDurationFromRow,
  attachSchedulesFromTable,
} from './doctorScheduleRows.js'

const DOCTOR_SELECT = `
  id,
  user_id,
  full_name,
  specialization,
  treatment_type,
  diseases,
  bio,
  consultation_fee,
  experience_years,
  is_verified,
  is_active,
  profile_image,
  weekly_schedule,
  slot_duration_minutes
`

export async function loadProfiles(userIds) {
  if (!userIds.length) return {}
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)
  return Object.fromEntries((data || []).map((p) => [p.id, p]))
}

export async function attachClinics(rows) {
  if (!rows.length) return rows

  const ids = rows.map((r) => r.id)

  const { data: directClinics, error: directErr } = await supabase
    .from('clinics')
    .select('id, doctor_id, name, city, address, timings, phone')
    .in('doctor_id', ids)

  if (!directErr && directClinics?.length) {
    const byDoctor = {}
    directClinics.forEach((c) => {
      if (!byDoctor[c.doctor_id]) byDoctor[c.doctor_id] = []
      byDoctor[c.doctor_id].push(c)
    })
    return rows.map((r) => ({
      ...r,
      clinics: byDoctor[r.id]?.length ? byDoctor[r.id] : r.clinics || [],
    }))
  }

  const { data: links, error: linkErr } = await supabase
    .from('doctor_clinics')
    .select('doctor_id, clinics:clinic_id ( name, city, address )')
    .in('doctor_id', ids)

  if (!linkErr && links?.length) {
    const byDoctor = {}
    links.forEach((link) => {
      const clinic = link.clinics
      if (!clinic) return
      if (!byDoctor[link.doctor_id]) byDoctor[link.doctor_id] = []
      byDoctor[link.doctor_id].push(clinic)
    })
    return rows.map((r) => ({
      ...r,
      clinics: byDoctor[r.id]?.length ? byDoctor[r.id] : r.clinics || [],
    }))
  }

  return rows.map((r) => ({ ...r, clinics: r.clinics || [] }))
}

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

const DOCTOR_SELECT_FALLBACKS = [
  DOCTOR_SELECT,
  `id, user_id, full_name, specialization, treatment_type, diseases, bio,
   consultation_fee, experience_years, is_verified, is_active, profile_image`,
  `id, user_id, full_name, specialization, bio, consultation_fee, is_verified, profile_image`,
  `id, user_id, full_name, specialization, bio, consultation_fee, is_verified`,
]

export async function fetchDoctorRows() {
  let rows = null
  let lastError = null
  for (const columns of DOCTOR_SELECT_FALLBACKS) {
    const { data, error } = await supabase.from('doctors').select(columns)
    if (!error) {
      rows = data || []
      break
    }
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  if (rows === null) throw lastError || new Error('Failed to load doctors')
  return attachClinics(rows)
}

const DOCTOR_BY_ID_SELECTS = [
  `${DOCTOR_SELECT}, slots_booked, address, phone, degree`,
  `${DOCTOR_SELECT}, slots_booked`,
  ...DOCTOR_SELECT_FALLBACKS,
]

/** Single doctor — avoids loading entire doctors table (booking, slots API). */
export async function fetchDoctorRowById(id) {
  let row = null
  let lastError = null
  for (const columns of DOCTOR_BY_ID_SELECTS) {
    const { data, error } = await supabase.from('doctors').select(columns).eq('id', id).maybeSingle()
    if (!error) {
      row = data
      break
    }
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  if (lastError && row === null && !lastError.message?.includes('0 rows')) {
    throw lastError
  }
  if (!row) return null
  const [withClinics] = await attachClinics([row])
  return withClinics
}

/** True when doctor accepts new bookings (module `is_active` + CareLink `available`). */
export function doctorAcceptsAppointments(row) {
  if (!row) return false
  if (row.is_active === false) return false
  if (row.available === false) return false
  return true
}

export function displayName(row, profile) {
  return row.full_name || profile?.full_name || 'Doctor'
}

const DEFAULT_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAACXBIWXMAABCcAAAQnAEmzTo0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADASURBVHgB7cExAQAAAMKg9U9tCy+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBuAABHgAAAABJRU5ErkJggg=='

export function displayImage(row, profile, { placeholder = true } = {}) {
  const url = row.profile_image || profile?.avatar_url
  if (url) return url
  return placeholder ? DEFAULT_IMAGE : null
}

/** Shape expected by CareLink-style frontend cards & admin list */
export function mapLegacyDoctorCard(row, profile, { forList = false } = {}) {
  const years = row.experience_years ?? 0
  const card = {
    id: row.id,
    name: displayName(row, profile),
    image: displayImage(row, profile, { placeholder: !forList }),
    speciality: row.specialization || 'General physician',
    degree: row.degree || 'MBBS',
    experience: years ? `${years} Year${years === 1 ? '' : 's'}` : '—',
    about: row.bio || '',
    available: doctorAcceptsAppointments(row),
    fees: Number(row.consultation_fee ?? row.fees ?? 0),
    address: row.address || { line1: '', line2: '' },
    date: row.date || Date.now(),
    treatment_type: row.treatment_type || 'allopathic',
    diseases: row.diseases || [],
    is_verified: row.is_verified ?? false,
  }
  if (!forList) {
    card.slots_booked = row.slots_booked || {}
    card.weekly_schedule = extractScheduleFromDoctorRow(row)
    card.slot_duration_minutes = extractSlotDurationFromRow(row)
  }
  return card
}

export function mapDoctorSummary(row, profile) {
  const clinics = (row.clinics || [])
    .filter((c) => c && (c.name || c.city || c.address))
    .map((c) => ({
      id: c.id ?? null,
      name: c.name ?? null,
      city: c.city ?? null,
      address: c.address ?? null,
      timings: c.timings ?? {},
    }))

  const years = row.experience_years ?? 0
  const verified = row.is_verified !== false
  const fee = Number(row.consultation_fee ?? row.fees ?? 0)

  return {
    id: row.id,
    full_name: displayName(row, profile),
    specialization: row.specialization || null,
    treatment_type: row.treatment_type || null,
    diseases: row.diseases || [],
    bio: row.bio ?? null,
    profile_image: displayImage(row, profile),
    consultation_fee: fee,
    fees: fee,
    experience_years: years,
    experience: years ? `${years} years` : row.experience || null,
    rating: verified ? 4.8 : 4.5,
    is_verified: verified,
    is_active: row.is_active !== false,
    available: doctorAcceptsAppointments(row),
    clinics,
  }
}

export function isDoctorVisible(row) {
  if (row.is_verified === false) return false
  return doctorAcceptsAppointments(row)
}

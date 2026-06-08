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

export function displayImage(row, profile) {
  const url = row.profile_image || profile?.avatar_url
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (trimmed.startsWith('data:image')) return null
  if (/ui-avatars\.com\/api\/\?name=Doctor(?:&|$)/i.test(trimmed)) return null
  return trimmed
}

/** Shape expected by CareLink-style frontend cards & admin list */
export function mapLegacyDoctorCard(row, profile) {
  const years = row.experience_years ?? 0
  return {
    id: row.id,
    name: displayName(row, profile),
    image: displayImage(row, profile),
    speciality: row.specialization || 'General physician',
    degree: row.degree || 'MBBS',
    experience: years ? `${years} Year${years === 1 ? '' : 's'}` : '—',
    about: row.bio || '',
    available: doctorAcceptsAppointments(row),
    fees: Number(row.consultation_fee ?? row.fees ?? 0),
    slots_booked: row.slots_booked || {},
    address: row.address || { line1: '', line2: '' },
    date: row.date || Date.now(),
    treatment_type: row.treatment_type || 'allopathic',
    diseases: row.diseases || [],
    is_verified: row.is_verified ?? false,
    weekly_schedule: extractScheduleFromDoctorRow(row),
    slot_duration_minutes: extractSlotDurationFromRow(row),
  }
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

  return {
    id: row.id,
    full_name: displayName(row, profile),
    specialization: row.specialization || null,
    treatment_type: row.treatment_type || null,
    diseases: row.diseases || [],
    bio: row.bio ?? null,
    profile_image: displayImage(row, profile),
    consultation_fee: Number(row.consultation_fee ?? 0),
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

import supabase from '../config/supabase.js'
import { resolveDoctorContextIdsOrCreate } from './appointmentDoctorRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function isMissingRelation(err) {
  return /relation.*does not exist/i.test(err?.message || '')
}

function normalizeTimings(input) {
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  if (!input || typeof input !== 'object') return {}
  const out = {}
  for (const key of DAY_KEYS) {
    if (input[key]) out[key] = String(input[key]).trim()
  }
  return out
}

export async function fetchClinicsForDoctor(contextUserId) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) return []

  const direct = await supabase
    .from('clinics')
    .select('*')
    .eq('doctor_id', doctorRowId)
    .order('created_at', { ascending: false })

  if (!direct.error) return direct.data || []
  if (!isMissingColumn(direct.error)) throw direct.error

  const linked = await supabase
    .from('doctor_clinics')
    .select('clinic_id, clinics:clinic_id (*)')
    .eq('doctor_id', doctorRowId)

  if (linked.error) {
    if (isMissingRelation(linked.error)) return []
    throw linked.error
  }

  return (linked.data || [])
    .map((row) => row.clinics)
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

async function clinicOwnedByDoctor(clinicId, doctorRowId) {
  const { data: direct, error: directErr } = await supabase
    .from('clinics')
    .select('id, doctor_id')
    .eq('id', clinicId)
    .maybeSingle()

  if (!directErr && direct && Object.prototype.hasOwnProperty.call(direct, 'doctor_id')) {
    return { owned: direct.doctor_id === doctorRowId, clinic: direct }
  }
  if (directErr && !isMissingColumn(directErr)) throw directErr

  const { data: link, error: linkErr } = await supabase
    .from('doctor_clinics')
    .select('doctor_id, clinic_id')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorRowId)
    .maybeSingle()

  if (linkErr) {
    if (isMissingRelation(linkErr)) return { owned: false, clinic: null }
    throw linkErr
  }

  return { owned: !!link, clinic: link ? { id: clinicId } : null }
}

export async function createClinicForDoctor(
  contextUserId,
  { name, address, city, phone, timings, clinic_name, available_days, start_time, end_time }
) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) throw new Error('Doctor profile not found')

  const timingsNorm = normalizeTimings(timings)
  const clinicLabel = (clinic_name || name || '').trim()
  const baseClinic = {
    name: clinicLabel,
    clinic_name: clinicLabel,
    address: address?.trim() || '',
    city: city?.trim() || '',
    phone: phone?.trim() || '',
    available_days: Array.isArray(available_days) ? available_days : [],
    start_time: start_time || null,
    end_time: end_time || null,
  }

  const directAttempts = [
    { ...baseClinic, doctor_id: doctorRowId, timings: timingsNorm },
    { ...baseClinic, doctor_id: doctorRowId },
    {
      name: baseClinic.name,
      address: baseClinic.address,
      city: baseClinic.city,
      phone: baseClinic.phone,
      doctor_id: doctorRowId,
      timings: timingsNorm,
    },
    baseClinic,
  ]

  for (const payload of directAttempts) {
    const { data, error } = await supabase.from('clinics').insert(payload).select('*').single()
    if (!error) {
      if (!payload.doctor_id) {
        await linkDoctorClinic(doctorRowId, data.id)
      }
      return { ...data, timings: data.timings || timingsNorm }
    }
    if (!isMissingColumn(error)) break
  }

  const junctionAttempts = [
    { ...baseClinic, timings: timingsNorm },
    baseClinic,
  ]

  for (const payload of junctionAttempts) {
    const { data: clinic, error } = await supabase.from('clinics').insert(payload).select('*').single()
    if (error) {
      if (!isMissingColumn(error)) throw error
      continue
    }
    await linkDoctorClinic(doctorRowId, clinic.id)
    return { ...clinic, timings: clinic.timings || timingsNorm }
  }

  throw new Error('Could not create clinic for this database schema')
}

async function linkDoctorClinic(doctorRowId, clinicId) {
  const { error } = await supabase.from('doctor_clinics').insert({
    doctor_id: doctorRowId,
    clinic_id: clinicId,
  })
  if (error && !/duplicate|unique/i.test(error.message || '')) {
    throw error
  }
}

export async function updateClinicForDoctor(contextUserId, clinicId, fields) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  const { owned } = await clinicOwnedByDoctor(clinicId, doctorRowId)
  if (!owned) return { ok: false, status: 403, message: 'Access denied' }

  const updates = {}
  if (fields.name !== undefined) updates.name = fields.name.trim()
  if (fields.address !== undefined) updates.address = fields.address.trim()
  if (fields.city !== undefined) updates.city = fields.city.trim()
  if (fields.phone !== undefined) updates.phone = fields.phone.trim()
  if (fields.timings !== undefined) updates.timings = normalizeTimings(fields.timings)

  const attempts = [updates, { ...updates }]
  if (updates.timings !== undefined) {
    attempts.push(
      Object.fromEntries(Object.entries(updates).filter(([k]) => k !== 'timings'))
    )
  }

  let lastError = null
  for (const patch of attempts) {
    if (!Object.keys(patch).length) continue
    const { data, error } = await supabase
      .from('clinics')
      .update(patch)
      .eq('id', clinicId)
      .select('*')
      .single()
    if (!error) return { ok: true, clinic: data }
    lastError = error
    if (!isMissingColumn(error)) throw error
  }

  throw lastError || new Error('Could not update clinic')
}

const DAY_NAME_TO_DOW = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function toScheduleTime(hhmm) {
  const [h, m] = String(hhmm).split(':')
  return `${String(h).padStart(2, '0')}:${String(m || '0').padStart(2, '0')}:00`
}

export async function createScheduleForClinic(
  contextUserId,
  clinicId,
  { day_of_week, start_time, end_time, slot_duration_minutes }
) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) throw new Error('Doctor profile not found')

  const { owned } = await clinicOwnedByDoctor(clinicId, doctorRowId)
  if (!owned) return { ok: false, status: 403, message: 'Access denied' }

  const dayIndex = DAY_NAME_TO_DOW[day_of_week]
  if (dayIndex === undefined) {
    return { ok: false, status: 400, message: 'Invalid day_of_week' }
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      doctor_id: doctorRowId,
      clinic_id: clinicId,
      day_of_week: dayIndex,
      start_time: toScheduleTime(start_time),
      end_time: toScheduleTime(end_time),
      slot_duration_minutes,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) throw error
  return { ok: true, schedule: data }
}

import supabase from '../config/supabase.js'
import {
  resolveDoctorContextIds,
  resolveDoctorContextIdsOrCreate,
} from './appointmentDoctorRows.js'

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const META_SCHEDULE = '__weekly_schedule__'
const META_DURATION = '__slot_duration_minutes__'

/** DB day_of_week: 0 = Sunday … 6 = Saturday */
const DAY_TO_DOW = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const DOW_TO_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const DEFAULT_WEEKLY_SCHEDULE = {
  mon: { enabled: true, start: '10:00', end: '21:00' },
  tue: { enabled: true, start: '10:00', end: '21:00' },
  wed: { enabled: true, start: '10:00', end: '21:00' },
  thu: { enabled: true, start: '10:00', end: '21:00' },
  fri: { enabled: true, start: '10:00', end: '21:00' },
  sat: { enabled: true, start: '10:00', end: '17:00' },
  sun: { enabled: false, start: '10:00', end: '17:00' },
}

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function isMissingRelation(err) {
  return /relation.*does not exist/i.test(err?.message || '')
}

function toTimeValue(hhmm) {
  const [h, m] = String(hhmm || '10:00').split(':')
  return `${String(h).padStart(2, '0')}:${String(m || '0').padStart(2, '0')}:00`
}

function fromTimeValue(t) {
  if (!t) return '10:00'
  return String(t).slice(0, 5)
}

import {
  normalizeWeeklyScheduleWithSlots,
} from './slotAvailability.js'

export function normalizeWeeklySchedule(input, slotDurationMinutes = 30) {
  return normalizeWeeklyScheduleWithSlots(input || DEFAULT_WEEKLY_SCHEDULE, slotDurationMinutes)
}

export function normalizeSlotDuration(value) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return 30
  if (n >= 10 && n <= 120) return n
  return 30
}

export function extractScheduleFromDoctorRow(row) {
  const duration = extractSlotDurationFromRow(row)
  if (!row) return normalizeWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE, duration)
  if (row.weekly_schedule && Object.keys(row.weekly_schedule).length) {
    return normalizeWeeklySchedule(row.weekly_schedule, duration)
  }
  const sb = row.slots_booked
  if (sb && typeof sb === 'object' && sb[META_SCHEDULE]) {
    return normalizeWeeklySchedule(sb[META_SCHEDULE], duration)
  }
  return normalizeWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE, duration)
}

export function extractSlotDurationFromRow(row) {
  if (!row) return 30
  if (row.slot_duration_minutes) return normalizeSlotDuration(row.slot_duration_minutes)
  const sb = row.slots_booked
  if (sb && typeof sb === 'object' && sb[META_DURATION]) {
    return normalizeSlotDuration(sb[META_DURATION])
  }
  return 30
}

function scheduleFromSlotsBooked(slotsBooked) {
  if (!slotsBooked || typeof slotsBooked !== 'object') return null
  if (!slotsBooked[META_SCHEDULE]) return null
  return {
    weekly_schedule: normalizeWeeklySchedule(slotsBooked[META_SCHEDULE], normalizeSlotDuration(slotsBooked[META_DURATION])),
    slot_duration_minutes: normalizeSlotDuration(slotsBooked[META_DURATION]),
  }
}

async function loadFromSchedulesTable(doctorRowId) {
  const { data: rows, error } = await supabase
    .from('schedules')
    .select('day_of_week, start_time, end_time, slot_duration_minutes')
    .eq('doctor_id', doctorRowId)
    .eq('is_active', true)

  if (error) {
    if (isMissingRelation(error)) return null
    throw error
  }
  if (!rows?.length) return null

  const raw = Object.fromEntries(
    DAY_KEYS.map((k) => [k, { enabled: false, start: '10:00', end: '17:00' }])
  )
  let slot_duration_minutes = 30
  for (const r of rows) {
    const key = DOW_TO_DAY[r.day_of_week]
    if (!key) continue
    raw[key] = {
      enabled: true,
      start: fromTimeValue(r.start_time),
      end: fromTimeValue(r.end_time),
    }
    if (r.slot_duration_minutes) {
      slot_duration_minutes = normalizeSlotDuration(r.slot_duration_minutes)
    }
  }

  return {
    weekly_schedule: normalizeWeeklySchedule(raw, slot_duration_minutes),
    slot_duration_minutes,
  }
}

async function resolveClinicIdForSchedule(doctorRowId) {
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

  if (!clinic) throw clinicErr || new Error('Could not create clinic for schedule')

  const { error: dcErr } = await supabase.from('doctor_clinics').insert({
    doctor_id: doctorRowId,
    clinic_id: clinic.id,
  })

  if (dcErr && !isMissingRelation(dcErr)) {
    const { error: alt } = await supabase
      .from('clinics')
      .update({ doctor_id: doctorRowId })
      .eq('id', clinic.id)
    if (alt && !isMissingColumn(alt)) throw alt
  }

  return clinic.id
}


async function saveToSchedulesTable(doctorRowId, schedule, duration) {
  const clinicId = await resolveClinicIdForSchedule(doctorRowId)

  await supabase.from('schedules').delete().eq('doctor_id', doctorRowId)

  const inserts = []
  for (const key of DAY_KEYS) {
    const day = schedule[key]
    if (!day?.enabled) continue
    inserts.push({
      doctor_id: doctorRowId,
      clinic_id: clinicId,
      day_of_week: DAY_TO_DOW[key],
      start_time: toTimeValue(day.start),
      end_time: toTimeValue(day.end),
      slot_duration_minutes: duration,
      is_active: true,
    })
  }

  if (!inserts.length) return

  const { error } = await supabase.from('schedules').insert(inserts)
  if (error) throw error
}

async function saveToSlotsBookedMeta(doctorRowId, schedule, duration) {
  const { data: row, error: fetchErr } = await supabase
    .from('doctors')
    .select('slots_booked')
    .eq('id', doctorRowId)
    .maybeSingle()

  if (fetchErr) {
    if (isMissingColumn(fetchErr)) return false
    throw fetchErr
  }

  const existing = row?.slots_booked && typeof row.slots_booked === 'object' ? { ...row.slots_booked } : {}
  for (const key of Object.keys(existing)) {
    if (key.startsWith('__')) delete existing[key]
  }
  existing[META_SCHEDULE] = schedule
  existing[META_DURATION] = duration

  const { error } = await supabase
    .from('doctors')
    .update({ slots_booked: existing })
    .eq('id', doctorRowId)

  if (error) {
    if (isMissingColumn(error)) return false
    throw error
  }
  return true
}

export async function attachSchedulesFromTable(rows) {
  if (!rows?.length) return rows
  const ids = rows.map((r) => r.id).filter(Boolean)
  if (!ids.length) return rows

  const { data: schedRows, error } = await supabase
    .from('schedules')
    .select('doctor_id, day_of_week, start_time, end_time, slot_duration_minutes')
    .in('doctor_id', ids)
    .eq('is_active', true)

  if (error) {
    if (isMissingRelation(error)) return rows
    throw error
  }

  const byDoctor = {}
  for (const r of schedRows || []) {
    if (!byDoctor[r.doctor_id]) byDoctor[r.doctor_id] = []
    byDoctor[r.doctor_id].push(r)
  }

  return rows.map((row) => {
    const list = byDoctor[row.id]
    if (!list?.length) return row
    const raw = Object.fromEntries(
      DAY_KEYS.map((k) => [k, { enabled: false, start: '10:00', end: '17:00' }])
    )
    let slot_duration_minutes = 30
    for (const r of list) {
      const key = DOW_TO_DAY[r.day_of_week]
      if (!key) continue
      raw[key] = {
        enabled: true,
        start: fromTimeValue(r.start_time),
        end: fromTimeValue(r.end_time),
      }
      if (r.slot_duration_minutes) slot_duration_minutes = normalizeSlotDuration(r.slot_duration_minutes)
    }
    const weekly_schedule = normalizeWeeklySchedule(raw, slot_duration_minutes)
    return { ...row, weekly_schedule, slot_duration_minutes }
  })
}

export async function fetchDoctorSchedule(contextUserId) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) throw new Error('Doctor profile not found')

  const attempts = [
    'weekly_schedule, slot_duration_minutes, slots_booked, is_active',
    'weekly_schedule, slot_duration_minutes, is_active',
    'is_active',
    'id',
  ]

  let row = null
  for (const columns of attempts) {
    const { data, error } = await supabase
      .from('doctors')
      .select(columns)
      .eq('id', doctorRowId)
      .maybeSingle()

    if (!error && data) {
      row = data
      break
    }
    if (error && !isMissingColumn(error)) throw error
  }

  const available =
    row == null
      ? true
      : row.available !== false && row.is_active !== false

  if (!row) {
    const fromTable = await loadFromSchedulesTable(doctorRowId)
    if (fromTable) {
      return { ...fromTable, accepting_appointments: available }
    }
    return {
      weekly_schedule: normalizeWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE),
      slot_duration_minutes: 30,
      accepting_appointments: available,
    }
  }

  if (row.weekly_schedule && Object.keys(row.weekly_schedule).length) {
    return {
      weekly_schedule: normalizeWeeklySchedule(row.weekly_schedule),
      slot_duration_minutes: normalizeSlotDuration(row.slot_duration_minutes),
      accepting_appointments: available,
    }
  }

  const fromMeta = scheduleFromSlotsBooked(row.slots_booked)
  if (fromMeta) {
    return { ...fromMeta, accepting_appointments: available }
  }

  const fromTable = await loadFromSchedulesTable(doctorRowId)
  if (fromTable) {
    return { ...fromTable, accepting_appointments: available }
  }

  return {
    weekly_schedule: normalizeWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE),
    slot_duration_minutes: 30,
    accepting_appointments: available,
  }
}

export async function saveDoctorSchedule(contextUserId, { weekly_schedule, slot_duration_minutes }) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) throw new Error('Doctor profile not found')

  const schedule = normalizeWeeklySchedule(weekly_schedule, duration)
  const duration = normalizeSlotDuration(slot_duration_minutes)

  const columnAttempts = [
    { weekly_schedule: schedule, slot_duration_minutes: duration },
    { weekly_schedule: schedule },
  ]

  for (const patch of columnAttempts) {
    const { error } = await supabase.from('doctors').update(patch).eq('id', doctorRowId)
    if (!error) return { weekly_schedule: schedule, slot_duration_minutes: duration }
    if (!isMissingColumn(error)) throw error
  }

  if (await saveToSlotsBookedMeta(doctorRowId, schedule, duration)) {
    return { weekly_schedule: schedule, slot_duration_minutes: duration }
  }

  try {
    await saveToSchedulesTable(doctorRowId, schedule, duration)
    return { weekly_schedule: schedule, slot_duration_minutes: duration }
  } catch (err) {
    if (!isMissingRelation(err)) throw err
  }

  throw new Error(
    'Could not save schedule. Please try again or contact hospital support.'
  )
}

/** Parse "HH:MM" or "10:00 AM" to minutes from midnight */
export function timeToMinutes(timeStr) {
  const raw = String(timeStr || '10:00').trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!match) return 10 * 60
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ap = (match[3] || '').toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return h * 60 + m
}

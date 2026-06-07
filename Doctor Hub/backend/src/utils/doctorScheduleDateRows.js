import supabase from '../config/supabase.js'
import { resolveDoctorContextIdsOrCreate } from './appointmentDoctorRows.js'

function isMissingRelation(err) {
  return /relation.*does not exist|doctor_schedules/i.test(err?.message || '')
}

function normalizeTimeSlots(slots) {
  if (!Array.isArray(slots)) return []
  return slots
    .map((s) => {
      if (typeof s === 'string') return s.trim()
      if (s?.time) return String(s.time).trim()
      return null
    })
    .filter(Boolean)
}

export async function fetchDateSchedules(doctorRowId) {
  const { data, error } = await supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', doctorRowId)
    .order('schedule_date', { ascending: true })

  if (error) {
    if (isMissingRelation(error)) return []
    throw error
  }

  return (data || []).map((row) => ({
    id: row.id,
    date: row.schedule_date,
    time_slots: normalizeTimeSlots(row.time_slots),
    is_available: row.is_available !== false,
  }))
}

export async function saveDateSchedules(doctorRowId, entries = []) {
  if (!Array.isArray(entries)) {
    throw new Error('date_schedules must be an array')
  }

  for (const entry of entries) {
    const date = entry.date || entry.schedule_date
    if (!date) continue

    const time_slots = normalizeTimeSlots(entry.time_slots || entry.slots || [])
    const is_available = entry.is_available !== false

    const payload = {
      doctor_id: doctorRowId,
      schedule_date: date,
      time_slots,
      is_available,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('doctor_schedules').upsert(payload, {
      onConflict: 'doctor_id,schedule_date',
    })

    if (error) {
      if (isMissingRelation(error)) {
        throw new Error(
          'doctor_schedules table missing. Run supabase/022_doctor_module.sql in Supabase SQL Editor.'
        )
      }
      throw error
    }
  }

  return fetchDateSchedules(doctorRowId)
}

export async function deleteDateSchedule(doctorRowId, scheduleDate) {
  const { error } = await supabase
    .from('doctor_schedules')
    .delete()
    .eq('doctor_id', doctorRowId)
    .eq('schedule_date', scheduleDate)

  if (error && !isMissingRelation(error)) throw error
}

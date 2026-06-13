import supabase from '../config/supabase.js'
import {
  extractScheduleFromDoctorRow,
  DAY_KEYS,
} from './doctorScheduleRows.js'

/** Default 1-hour slots 9 AM – 5 PM (last slot 16:00) */
export const STANDARD_HOURLY_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
]

const JS_DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function normalizeSlotTime24(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    return `${String(parseInt(m24[1], 10)).padStart(2, '0')}:${m24[2]}`
  }
  const m12 = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
  if (m12) {
    let h = parseInt(m12[1], 10)
    const min = m12[2]
    const ap = (m12[3] || '').toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${min}`
  }
  return s
}

export function formatSlotDisplay(time24) {
  const t = normalizeSlotTime24(time24)
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function slotDateKeyFromDate(date) {
  return `${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}`
}

export function slotDateKeyFromIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return `${d}_${m}_${y}`
}

export function isoFromSlotDateKey(key) {
  const parts = String(key).split('_').map(Number)
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function timeToMinutes(timeStr) {
  const t = normalizeSlotTime24(timeStr)
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function generateHourlySlotsFromRange(start, end, stepMinutes = 60) {
  const slots = []
  let cur = timeToMinutes(start)
  const endM = timeToMinutes(end)
  while (cur < endM) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    cur += stepMinutes
  }
  return slots
}

export function normalizeDaySchedule(day, fallbackSlots = STANDARD_HOURLY_SLOTS) {
  if (!day || typeof day !== 'object') {
    return { enabled: false, start: '09:00', end: '17:00', time_slots: [] }
  }

  let time_slots = Array.isArray(day.time_slots)
    ? [...new Set(day.time_slots.map(normalizeSlotTime24).filter(Boolean))].sort()
    : []

  const start = String(day.start || '09:00').slice(0, 5)
  const end = String(day.end || '17:00').slice(0, 5)

  if (!time_slots.length && day.enabled !== false) {
    if (day.start && day.end) {
      time_slots = generateHourlySlotsFromRange(start, end, 60)
    } else {
      time_slots = [...fallbackSlots]
    }
  }

  const enabled = day.enabled !== false && time_slots.length > 0

  return {
    enabled,
    start,
    end,
    time_slots: enabled ? time_slots : [],
  }
}

export function normalizeWeeklyScheduleWithSlots(input) {
  const out = {}
  for (const key of [...DAY_KEYS, ...JS_DAY_TO_KEY]) {
    if (input?.[key]) out[key] = normalizeDaySchedule(input[key])
  }
  for (const key of JS_DAY_TO_KEY) {
    if (!out[key]) out[key] = normalizeDaySchedule(null)
  }
  return out
}

export function getAllowedSlotsForDate(docRow, isoDate, dateSchedules = []) {
  const schedule = extractScheduleFromDoctorRow(docRow)
  const weekly = normalizeWeeklyScheduleWithSlots(schedule)

  const override = (dateSchedules || []).find((d) => d.date === isoDate)
  if (override) {
    if (override.is_available === false) return []
    const slots = (override.time_slots || []).map(normalizeSlotTime24).filter(Boolean)
    return [...new Set(slots)].sort()
  }

  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dayKey = JS_DAY_TO_KEY[date.getDay()]
  const dayRule = weekly[dayKey]
  if (!dayRule?.enabled) return []
  return dayRule.time_slots || []
}

function bookedFromJson(slotsBooked, slotDateKey) {
  const raw = slotsBooked?.[slotDateKey] || []
  return raw.map(normalizeSlotTime24).filter(Boolean)
}

async function bookedFromAppointments(doctorRowId, isoDate) {
  const booked = new Set()

  for (const col of ['doctor_id', 'doc_id']) {
    const { data, error } = await supabase
      .from('appointments')
      .select('slot_date, slot_time, scheduled_at, status, cancelled')
      .eq(col, doctorRowId)
      .limit(200)

    if (error) continue

    for (const row of data || []) {
      if (row.cancelled === true) continue
      const st = (row.status || '').toLowerCase()
      if (st === 'cancelled') continue

      let rowIso = null
      if (row.scheduled_at) {
        const dt = new Date(row.scheduled_at)
        if (!Number.isNaN(dt.getTime())) {
          rowIso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        }
      }
      if (!rowIso && row.slot_date) {
        rowIso = isoFromSlotDateKey(row.slot_date)
      }
      if (rowIso !== isoDate) continue
      if (row.slot_time) booked.add(normalizeSlotTime24(row.slot_time))
    }
  }

  return [...booked]
}

export async function getBookedSlotTimes(doctorRowId, isoDate, slotsBooked = {}) {
  const key = slotDateKeyFromIso(isoDate)
  const fromJson = bookedFromJson(slotsBooked, key)
  const fromDb = await bookedFromAppointments(doctorRowId, isoDate)
  return [...new Set([...fromJson, ...fromDb])]
}

export async function getAvailableSlotsForDate(docRow, isoDate, dateSchedules = []) {
  const allowed = getAllowedSlotsForDate(docRow, isoDate, dateSchedules)
  if (!allowed.length) return { allowed: [], available: [], booked: [] }

  const booked = await getBookedSlotTimes(docRow.id, isoDate, docRow.slots_booked || {})
  const bookedSet = new Set(booked)

  const now = new Date()
  const [y, m, d] = isoDate.split('-').map(Number)
  const isToday =
    now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === d

  const available = allowed.filter((slot) => {
    if (bookedSet.has(slot)) return false
    if (isToday) {
      const [hh, mm] = slot.split(':').map(Number)
      const slotDt = new Date(y, m - 1, d, hh, mm, 0)
      if (slotDt <= now) return false
    }
    return true
  })

  return { allowed, available, booked }
}

export async function buildAvailabilityWindow(docRow, { days = 14, dateSchedules = [] } = {}) {
  const result = {}
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { allowed, available, booked } = await getAvailableSlotsForDate(docRow, iso, dateSchedules)
    result[iso] = {
      allowed: allowed.map((t) => ({ time: t, label: formatSlotDisplay(t) })),
      available: available.map((t) => ({ time: t, label: formatSlotDisplay(t) })),
      booked: booked.map((t) => ({ time: t, label: formatSlotDisplay(t) })),
    }
  }

  return result
}

export async function validateSlotBooking(docRow, isoDate, slotTimeRaw, dateSchedules = []) {
  const slotTime = normalizeSlotTime24(slotTimeRaw)
  const slotDate = slotDateKeyFromIso(isoDate)
  const { allowed, available, booked } = await getAvailableSlotsForDate(docRow, isoDate, dateSchedules)

  if (!allowed.includes(slotTime)) {
    return {
      ok: false,
      message: 'This time is not in the doctor\'s schedule. Please pick another slot.',
      availableSlots: available.map(formatSlotDisplay),
      slotDate,
      slotTime,
    }
  }

  if (booked.includes(slotTime)) {
    const labels = available.map(formatSlotDisplay)
    return {
      ok: false,
      message: labels.length
        ? `This slot is already booked. Available slots: ${labels.join(', ')}`
        : 'This slot is already booked. No other slots left on this day — try another date.',
      availableSlots: labels,
      slotDate,
      slotTime,
    }
  }

  if (!available.includes(slotTime)) {
    const labels = available.map(formatSlotDisplay)
    return {
      ok: false,
      message: labels.length
        ? `This slot is no longer available. Try: ${labels.join(', ')}`
        : 'This slot is no longer available on this day.',
      availableSlots: labels,
      slotDate,
      slotTime,
    }
  }

  return {
    ok: true,
    slotDate,
    slotTime: formatSlotDisplay(slotTime),
    slotTime24: slotTime,
  }
}

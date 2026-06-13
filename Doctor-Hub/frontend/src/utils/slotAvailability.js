/** Client helpers for doctor slot booking (mirrors backend slotAvailability). */

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

export function isoDateOffset(daysFromToday) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Build calendar arrays from GET /doctors/:id/available-slots response */
export function calendarFromAvailabilityApi(slotsByDate, days = 14) {
  const result = []
  for (let i = 0; i < days; i++) {
    const iso = isoDateOffset(i)
    const day = slotsByDate?.[iso]
    const [y, m, d] = iso.split('-').map(Number)
    const times = (day?.available || []).map((s) => {
      const time24 = normalizeSlotTime24(s.time)
      const dt = new Date(y, m - 1, d, ...time24.split(':').map(Number))
      return {
        datetime: dt,
        time: s.label || formatSlotDisplay(time24),
        time24,
        iso,
      }
    })
    result.push(times)
  }
  return result
}

/** Fallback when API unavailable — uses weekly_schedule.time_slots */
export function buildSlotsFromWeekly(docInfo, days = 14) {
  if (!docInfo || docInfo.available === false) return []

  const schedule = docInfo.weekly_schedule || {}
  const dateMap = {}
  for (const row of docInfo.date_schedules || []) {
    dateMap[row.date] = row
  }

  const result = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(today)
    dayStart.setDate(today.getDate() + i)
    const iso = isoDateOffset(i)
    const dayKey = JS_DAY_TO_KEY[dayStart.getDay()]

    let allowed = []
    const override = dateMap[iso]
    if (override) {
      if (override.is_available !== false) {
        allowed = (override.time_slots || []).map(normalizeSlotTime24)
      }
    } else {
      const dayRule = schedule[dayKey]
      if (dayRule?.enabled !== false) {
        allowed = (dayRule.time_slots || []).map(normalizeSlotTime24)
        if (!allowed.length && dayRule.start && dayRule.end) {
          // legacy start/end — skip, API preferred
        }
      }
    }

    const slotDateKey = `${dayStart.getDate()}_${dayStart.getMonth() + 1}_${dayStart.getFullYear()}`
    const booked = (docInfo.slots_booked?.[slotDateKey] || []).map(normalizeSlotTime24)
    const bookedSet = new Set(booked)

    const now = new Date()
    const isToday = i === 0

    const times = allowed
      .filter((slot) => {
        if (bookedSet.has(slot)) return false
        if (isToday) {
          const [hh, mm] = slot.split(':').map(Number)
          const slotDt = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), hh, mm)
          if (slotDt <= now) return false
        }
        return true
      })
      .map((slot) => {
        const [hh, mm] = slot.split(':').map(Number)
        const dt = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), hh, mm)
        return { datetime: dt, time: formatSlotDisplay(slot), time24: slot, iso }
      })

    result.push(times)
  }

  return result
}

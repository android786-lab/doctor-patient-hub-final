/** Slot grid helpers for doctor schedule (mirrors backend slotAvailability). */

export const WORK_START = '09:00'
export const WORK_END = '17:00'

export const SLOT_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
]

export function normalizeSlotDuration(value) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return 30
  if (n >= 10 && n <= 120) return n
  return 30
}

function timeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '09:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Build bookable slot times from start/end using the chosen interval. */
export function buildSlotsForDuration(durationMinutes, start = WORK_START, end = WORK_END) {
  const step = normalizeSlotDuration(durationMinutes)
  const slots = []
  let cur = timeToMinutes(start)
  const endM = timeToMinutes(end)
  while (cur < endM) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    cur += step
  }
  return slots
}

export function formatSlotLabel(time24) {
  const [h, m] = String(time24).split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

import { fetchDoctorRowById, isDoctorVisible } from '../utils/doctorRows.js'
import { fetchDateSchedules } from '../utils/doctorScheduleDateRows.js'
import { buildAvailabilityWindow } from '../utils/slotAvailability.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getDoctorAvailableSlots(req, res) {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid doctor id' })
  }

  try {
    const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 14))
    const rows = await fetchDoctorRowById(req.params.id)
    const row = rows

    if (!row || !isDoctorVisible(row)) {
      return res.status(404).json({ success: false, message: 'Doctor not found' })
    }

    const dateSchedules = await fetchDateSchedules(row.id)
    const slots_by_date = await buildAvailabilityWindow(row, { days, dateSchedules })

    return res.json({
      success: true,
      doctor_id: row.id,
      days,
      slots_by_date,
    })
  } catch (err) {
    console.error('getDoctorAvailableSlots:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load slots' })
  }
}

import {
  fetchDoctorSchedule,
  saveDoctorSchedule,
} from '../utils/doctorScheduleRows.js'

export async function getMySchedule(req, res) {
  try {
    const schedule = await fetchDoctorSchedule(req.user?.id)
    return res.json({ success: true, ...schedule })
  } catch (err) {
    console.error('getMySchedule:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load schedule' })
  }
}

export async function saveMySchedule(req, res) {
  try {
    const { weekly_schedule, slot_duration_minutes } = req.body
    const saved = await saveDoctorSchedule(req.user?.id, {
      weekly_schedule,
      slot_duration_minutes,
    })
    return res.json({
      success: true,
      message: 'Schedule saved — patients will see updated slots when booking.',
      ...saved,
    })
  } catch (err) {
    console.error('saveMySchedule:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to save schedule' })
  }
}

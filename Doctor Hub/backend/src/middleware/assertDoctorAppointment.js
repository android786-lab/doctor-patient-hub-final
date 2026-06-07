import supabase from '../config/supabase.js'
import {
  appointmentBelongsToDoctor,
  resolveDoctorContextIdsOrCreate,
} from '../utils/appointmentDoctorRows.js'

export function isClinicalEligibleAppointment(appt) {
  if (!appt || appt.cancelled === true || appt.status === 'cancelled') return false
  if (appt.status === 'confirmed' || appt.status === 'completed') return true
  if (appt.is_completed === true || appt.isCompleted === true) return true
  return false
}

/** Loads appointment and ensures it belongs to the authenticated doctor. */
export async function loadDoctorAppointment(req, appointmentId) {
  const contextUserId = req.user?.id
  if (!contextUserId) {
    const err = new Error('Authentication required')
    err.status = 401
    throw err
  }

  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) {
    const err = new Error('Doctor profile not found')
    err.status = 403
    throw err
  }

  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle()

  if (error) throw error
  if (!appt || !appointmentBelongsToDoctor(appt, doctorRowId, contextUserId)) {
    const err = new Error('This appointment is not linked to your doctor account')
    err.status = 403
    throw err
  }

  return { appt, doctorRowId, contextUserId }
}

/** Middleware: req.body.appointmentId or req.params.appointmentId */
export default async function assertDoctorAppointment(req, res, next) {
  try {
    const appointmentId =
      req.body?.appointmentId || req.body?.appointment_id || req.params?.appointmentId

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required' })
    }

    const ctx = await loadDoctorAppointment(req, appointmentId)
    req.doctorAppointment = ctx.appt
    req.doctorRowId = ctx.doctorRowId
    return next()
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Appointment validation failed',
    })
  }
}

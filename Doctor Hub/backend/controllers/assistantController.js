import supabase from '../src/config/supabase.js'
import {
  fetchPendingVerificationAppointments,
  fetchAppointmentsForPaymentTab,
  mapAppointmentForAdmin,
  confirmAppointmentById,
  rejectAppointmentById,
} from '../src/utils/appointmentRows.js'
import { mapAppointmentsForPatientUi } from '../src/utils/patientAppointmentRows.js'
import {
  mapAppointmentsForDoctorUi,
  fetchAppointmentsForDoctor,
  appointmentBelongsToDoctor,
} from '../src/utils/appointmentDoctorRows.js'
import {
  filterAppointmentsForDoctorRow,
  resolveAssistantAssignment,
} from '../src/utils/assistantRows.js'

function scopePaymentRows(req, rows) {
  if (req.user?.role === 'assistant' && req.assistantAssignment?.doctorRowId) {
    return filterAppointmentsForDoctorRow(rows, req.assistantAssignment.doctorRowId)
  }
  return rows
}

export async function assertAssistantAppointmentAccess(req, appointmentId) {
  if (req.user?.role !== 'assistant' || !req.assistantAssignment) return
  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle()
  if (error) throw error
  if (
    !appt ||
    !appointmentBelongsToDoctor(
      appt,
      req.assistantAssignment.doctorRowId,
      req.assistantAssignment.doctorUserId
    )
  ) {
    const err = new Error('This appointment is not linked to your assigned doctor')
    err.status = 403
    throw err
  }
}

/** Assistant / admin verifies payment → appointment confirmed */
const listAwaitingVerification = async (req, res) => {
  try {
    let rows = await fetchPendingVerificationAppointments()
    rows = scopePaymentRows(req, rows)
    let normalized = rows
    if (rows.length && !rows.some((r) => r.user_data?.name && r.doc_data?.name)) {
      const withPatient = await mapAppointmentsForPatientUi(rows)
      normalized = await mapAppointmentsForDoctorUi(withPatient)
    }
    const appointments = normalized.map(mapAppointmentForAdmin)
    console.log(`[Verify payments] pending count: ${appointments.length}`)
    res.json({ success: true, appointments, count: appointments.length })
  } catch (error) {
    console.error('listAwaitingVerification:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId required' })
    }

    await assertAssistantAppointmentAccess(req, appointmentId)
    const data = await confirmAppointmentById(appointmentId)
    res.json({
      success: true,
      message: 'Appointment confirmed',
      appointment: mapAppointmentForAdmin(data),
    })
  } catch (error) {
    console.error('confirmAppointment:', error)
    res.status(error.status || 500).json({ success: false, message: error.message })
  }
}

async function normalizeForAdminList(rows) {
  let normalized = rows
  if (rows.length && !rows.some((r) => r.user_data?.name && r.doc_data?.name)) {
    const withPatient = await mapAppointmentsForPatientUi(rows)
    normalized = await mapAppointmentsForDoctorUi(withPatient)
  }
  return normalized.map(mapAppointmentForAdmin)
}

const listPaymentsVerification = async (req, res) => {
  try {
    const tab = (req.query.status || 'pending').toLowerCase()
    const allowed = ['pending', 'verified', 'rejected']
    if (!allowed.includes(tab)) {
      return res.status(400).json({ success: false, message: 'Invalid status tab' })
    }

    let rows =
      tab === 'pending'
        ? await fetchPendingVerificationAppointments()
        : await fetchAppointmentsForPaymentTab(tab)
    rows = scopePaymentRows(req, rows)

    const appointments = await normalizeForAdminList(rows)
    res.json({ success: true, appointments, count: appointments.length, status: tab })
  } catch (error) {
    console.error('listPaymentsVerification:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const rejectAppointment = async (req, res) => {
  try {
    const { appointmentId, reason } = req.body
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId required' })
    }

    await assertAssistantAppointmentAccess(req, appointmentId)
    const data = await rejectAppointmentById(appointmentId, reason)
    res.json({
      success: true,
      message: 'Payment rejected',
      appointment: mapAppointmentForAdmin(data),
    })
  } catch (error) {
    console.error('rejectAppointment:', error)
    res.status(error.status || 500).json({ success: false, message: error.message })
  }
}

export async function getAssistantMe(req, res) {
  try {
    const assignment =
      req.assistantAssignment ||
      (await resolveAssistantAssignment(req.user?.id))
    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'No doctor assigned. Contact admin to link your assistant account.',
      })
    }
    return res.json({ success: true, assignment })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function getAssistantPortalDashboard(req, res) {
  try {
    const assignment = req.assistantAssignment
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'No doctor assigned' })
    }

    const pendingRows = scopePaymentRows(
      req,
      await fetchPendingVerificationAppointments()
    )
    const verifiedRows = scopePaymentRows(req, await fetchAppointmentsForPaymentTab('verified'))
    const rejectedRows = scopePaymentRows(req, await fetchAppointmentsForPaymentTab('rejected'))

    const doctorAppts = await fetchAppointmentsForDoctor(assignment.doctorUserId)
    const mapped = await mapAppointmentsForDoctorUi(doctorAppts)
    const confirmed = mapped.filter(
      (a) =>
        a.status === 'confirmed' ||
        a.payment ||
        (a.is_completed && !a.cancelled)
    )

    const todayAppointments = mapped.filter((a) => {
      const now = new Date()
      if (a.slot_date) {
        const parts = String(a.slot_date).split('_')
        if (parts.length === 3) {
          const d = new Date(+parts[2], +parts[1] - 1, +parts[0])
          return d.toDateString() === now.toDateString()
        }
      }
      if (a.scheduled_at) {
        return new Date(a.scheduled_at).toDateString() === now.toDateString()
      }
      return false
    })
    const confirmedToday = todayAppointments.filter(
      (a) =>
        a.status === 'confirmed' ||
        a.status === 'completed' ||
        (a.payment && !a.cancelled)
    )

    return res.json({
      success: true,
      assignment,
      stats: {
        pending_payments: pendingRows.length,
        today_appointments: todayAppointments.length,
        confirmed_today: confirmedToday.length,
      },
      payments: {
        pending: pendingRows.length,
        verified: verifiedRows.length,
        rejected: rejectedRows.length,
      },
      doctor: {
        appointments: mapped.length,
        confirmed: confirmed.length,
        pendingVerification: pendingRows.length,
      },
      pendingPreview: (await normalizeForAdminList(pendingRows.slice(0, 5))).map((a) => ({
        id: a.id,
        patient_name: a.user_data?.name,
        doctor_name: a.doc_data?.name,
        slot_date: a.slot_date,
        slot_time: a.slot_time,
        amount: a.amount,
      })),
    })
  } catch (err) {
    console.error('getAssistantPortalDashboard:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

export { listAwaitingVerification, listPaymentsVerification, confirmAppointment, rejectAppointment }

import supabase from '../config/supabase.js'
import {
  fetchPendingVerificationAppointments,
  mapAppointmentForAdmin,
  confirmAppointmentById,
  rejectAppointmentById,
} from '../utils/appointmentRows.js'
import { mapAppointmentsForPatientUi } from '../utils/patientAppointmentRows.js'
import { mapAppointmentsForDoctorUi, fetchAppointmentsForDoctor } from '../utils/appointmentDoctorRows.js'
import { filterAppointmentsForDoctorRow } from '../utils/assistantRows.js'
import { assertAssistantAppointmentAccess } from '../../controllers/assistantController.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function scopeRows(req, rows) {
  if (req.user?.role === 'assistant' && req.assistantAssignment?.doctorRowId) {
    return filterAppointmentsForDoctorRow(rows, req.assistantAssignment.doctorRowId)
  }
  return rows
}

async function normalizeAdminList(rows) {
  let normalized = rows
  if (rows.length && !rows.some((r) => r.user_data?.name && r.doc_data?.name)) {
    const withPatient = await mapAppointmentsForPatientUi(rows)
    normalized = await mapAppointmentsForDoctorUi(withPatient)
  }
  return normalized.map(mapAppointmentForAdmin)
}

async function loadPaymentsByAppointmentIds(appointmentIds) {
  if (!appointmentIds.length) return {}
  const selects = [
    'id, appointment_id, amount, status, proof_url, screenshot_url, method, reference, verified_by, verified_at',
    'id, appointment_id, amount, status, proof_url, method, reference',
    'appointment_id, proof_url, method, reference',
  ]
  for (const sel of selects) {
    const { data, error } = await supabase
      .from('payments')
      .select(sel)
      .in('appointment_id', appointmentIds)
    if (!error) {
      return Object.fromEntries((data || []).map((p) => [p.appointment_id, p]))
    }
    if (!isMissingColumn(error)) throw error
  }
  return {}
}

function formatAppointmentDate(row) {
  if (row.slot_date) {
    const parts = String(row.slot_date).split('_')
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}${row.slot_time ? ` ${row.slot_time}` : ''}`
    }
    return `${row.slot_date}${row.slot_time ? ` · ${row.slot_time}` : ''}`
  }
  if (row.appointment_date) return String(row.appointment_date)
  if (row.scheduled_at) return new Date(row.scheduled_at).toLocaleString()
  return '—'
}

function mapPendingPaymentItem(appt, payment) {
  const screenshot =
    payment?.screenshot_url ||
    payment?.proof_url ||
    appt.payment_proof_url ||
    appt.proof_url ||
    null

  return {
    id: payment?.id || appt.id,
    payment_id: payment?.id || null,
    appointment_id: appt.id,
    patient_name: appt.user_data?.name || 'Patient',
    patient_image: appt.user_data?.image || null,
    doctor_name: appt.doc_data?.name || null,
    appointment_date: formatAppointmentDate(appt),
    slot_date: appt.slot_date,
    slot_time: appt.slot_time,
    amount: Number(payment?.amount ?? appt.amount ?? 0),
    screenshot_url: screenshot,
    payment_method: payment?.method || appt.payment_method || null,
    status: payment?.status || appt.status || 'pending',
  }
}

export async function getPendingPayments(req, res) {
  try {
    let rows = await fetchPendingVerificationAppointments()
    rows = scopeRows(req, rows)
    const appointments = await normalizeAdminList(rows)
    const payMap = await loadPaymentsByAppointmentIds(appointments.map((a) => a.id))

    const payments = appointments.map((a) => mapPendingPaymentItem(a, payMap[a.id]))

    return res.json({
      success: true,
      payments,
      count: payments.length,
    })
  } catch (err) {
    console.error('getPendingPayments:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load payments' })
  }
}

async function resolvePaymentTarget(req, id) {
  const { data: byPayId, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!payErr && byPayId) {
    await assertAssistantAppointmentAccess(req, byPayId.appointment_id)
    return { appointmentId: byPayId.appointment_id, payment: byPayId }
  }
  if (payErr && !isMissingColumn(payErr)) throw payErr

  await assertAssistantAppointmentAccess(req, id)
  const { data: byAppt } = await supabase
    .from('payments')
    .select('*')
    .eq('appointment_id', id)
    .maybeSingle()

  return { appointmentId: id, payment: byAppt || null }
}

async function patchPaymentRecord(appointmentId, patch) {
  const patches = [patch, { ...patch, status: patch.status === 'verified' ? 'succeeded' : patch.status }]
  for (const p of patches) {
    const { error } = await supabase.from('payments').update(p).eq('appointment_id', appointmentId)
    if (!error) return
    if (!isMissingColumn(error) && !/relation.*does not exist/i.test(error.message || '')) {
      console.warn('patchPaymentRecord:', error.message)
      return
    }
  }
}

export async function verifyPayment(req, res) {
  try {
    const { id } = req.params
    const { appointmentId, payment } = await resolvePaymentTarget(req, id)

    const data = await confirmAppointmentById(appointmentId)
    const verifiedAt = new Date().toISOString()
    const assistantId = req.assistantAssignment?.assistantRowId || null

    await patchPaymentRecord(appointmentId, {
      status: 'verified',
      verified_at: verifiedAt,
      verified_by: assistantId,
    })

    const appt = mapAppointmentForAdmin(data)
    return res.json({
      success: true,
      message: 'Payment verified — appointment confirmed',
      payment_id: payment?.id || id,
      appointment: appt,
    })
  } catch (err) {
    console.error('verifyPayment:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Verification failed',
    })
  }
}

export async function rejectPayment(req, res) {
  try {
    const { id } = req.params
    const reason = (req.body?.reason || req.body?.note || '').trim() || 'Payment not verified'
    const { appointmentId } = await resolvePaymentTarget(req, id)

    const data = await rejectAppointmentById(appointmentId, reason)
    const assistantId = req.assistantAssignment?.assistantRowId || null

    await patchPaymentRecord(appointmentId, {
      status: 'rejected',
      verified_by: assistantId,
      reference: reason,
    })

    return res.json({
      success: true,
      message: 'Payment rejected',
      appointment: mapAppointmentForAdmin(data),
    })
  } catch (err) {
    console.error('rejectPayment:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Rejection failed',
    })
  }
}

function isTodayRow(row) {
  const now = new Date()
  if (row.slot_date) {
    const parts = String(row.slot_date).split('_')
    if (parts.length === 3) {
      const d = new Date(+parts[2], +parts[1] - 1, +parts[0])
      return d.toDateString() === now.toDateString()
    }
  }
  if (row.scheduled_at) {
    return new Date(row.scheduled_at).toDateString() === now.toDateString()
  }
  if (row.appointment_date) {
    return new Date(row.appointment_date).toDateString() === now.toDateString()
  }
  return false
}

async function listDoctorAppointments(req, { bookingView = false } = {}) {
  const assignment = req.assistantAssignment
  if (!assignment) {
    const err = new Error('No doctor assigned')
    err.status = 403
    throw err
  }

  const raw = await fetchAppointmentsForDoctor(assignment.doctorUserId)
  const scoped = filterAppointmentsForDoctorRow(raw, assignment.doctorRowId)
  const mapped = await mapAppointmentsForDoctorUi(scoped)
  const payMap = await loadPaymentsByAppointmentIds(mapped.map((a) => a.id))

  return mapped.map((row) => {
    const pay = payMap[row.id]
    const base = {
      id: row.id,
      patient_id: row.user_id || row.patient_id || null,
      patient_name: row.user_data?.name || row.patient_name || 'Patient',
      patient_image: row.user_data?.image || null,
      doctor_name: row.doc_data?.name || assignment.doctorName,
      appointment_date: formatAppointmentDate(row),
      slot_date: row.slot_date,
      slot_time: row.slot_time,
      status: row.status || (row.cancelled ? 'cancelled' : row.payment ? 'pending' : 'pending'),
      amount: Number(pay?.amount ?? row.amount ?? 0),
      payment_status: pay?.status || null,
      cancelled: row.cancelled === true,
      is_completed: row.is_completed === true,
      ended_early: row.ended_early === true,
      early_end_reason: row.early_end_reason || null,
      ended_by: row.ended_by || null,
      ended_at: row.ended_at || null,
    }
    if (bookingView) {
      return {
        ...base,
        payment_id: pay?.id || null,
        screenshot_url:
          pay?.screenshot_url || pay?.proof_url || row.payment_proof_url || null,
        payment_method: pay?.method || row.payment_method || null,
        created_at: row.created_at || null,
      }
    }
    return base
  })
}

export async function getAssistantAppointments(req, res) {
  try {
    const appointments = await listDoctorAppointments(req)
    return res.json({ success: true, appointments, count: appointments.length })
  } catch (err) {
    console.error('getAssistantAppointments:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to load appointments',
    })
  }
}

export async function getAssistantBookings(req, res) {
  try {
    const bookings = await listDoctorAppointments(req, { bookingView: true })
    return res.json({ success: true, bookings, count: bookings.length })
  } catch (err) {
    console.error('getAssistantBookings:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to load bookings',
    })
  }
}

export async function getPatientAppointmentHistory(req, res) {
  try {
    const { patientId } = req.params
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' })
    }

    const assignment = req.assistantAssignment
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'No doctor assigned' })
    }

    const raw = await fetchAppointmentsForDoctor(assignment.doctorUserId)
    const scoped = filterAppointmentsForDoctorRow(raw, assignment.doctorRowId)
    const forPatient = scoped.filter(
      (row) =>
        row.user_id === patientId ||
        row.patient_id === patientId ||
        row.user_data?.id === patientId
    )

    const mapped = await mapAppointmentsForDoctorUi(forPatient)
    const history = mapped
      .map((row) => ({
        id: row.id,
        appointment_date: formatAppointmentDate(row),
        slot_date: row.slot_date,
        slot_time: row.slot_time,
        status: row.status || (row.cancelled ? 'cancelled' : 'pending'),
        is_completed: row.is_completed === true || row.status === 'completed',
        ended_early: row.ended_early === true,
        early_end_reason: row.early_end_reason || null,
        ended_by: row.ended_by || null,
        ended_at: row.ended_at || null,
        amount: Number(row.amount ?? 0),
      }))
      .sort((a, b) => String(b.appointment_date).localeCompare(String(a.appointment_date)))

    return res.json({ success: true, patientId, history, count: history.length })
  } catch (err) {
    console.error('getPatientAppointmentHistory:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to load patient history',
    })
  }
}

export async function getAssistantDashboardStats(req, res) {
  try {
    const assignment = req.assistantAssignment
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'No doctor assigned' })
    }

    const pendingRows = scopeRows(req, await fetchPendingVerificationAppointments())
    const raw = await fetchAppointmentsForDoctor(assignment.doctorUserId)
    const scoped = filterAppointmentsForDoctorRow(raw, assignment.doctorRowId)
    const mapped = await mapAppointmentsForDoctorUi(scoped)

    const todayAppointments = mapped.filter(isTodayRow)
    const confirmedToday = todayAppointments.filter(
      (a) =>
        a.status === 'confirmed' ||
        a.status === 'completed' ||
        (a.payment && !a.cancelled && a.status !== 'awaiting_verification')
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
        verified: mapped.filter((a) => a.status === 'confirmed').length,
        rejected: mapped.filter((a) => a.status === 'rejected' || a.cancelled).length,
      },
    })
  } catch (err) {
    console.error('getAssistantDashboardStats:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

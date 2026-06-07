import { getMyAppointments } from './appointmentsController.js'
import { getMyHistory } from './historyController.js'
import { fetchHistoryForPatient, resolvePatientId } from '../utils/medicalHistoryRows.js'
import { bookAppointmentForPatient } from '../utils/bookAppointmentRows.js'
import { toDateFromInput } from '../utils/parseDateInput.js'
import { paymentManual } from './manualPaymentController.js'

function parseSlotFromBooking({ date, timeSlot, slotDate, slotTime }) {
  if (slotDate && slotTime) {
    return { slotDate: String(slotDate), slotTime: String(slotTime).trim() }
  }
  if (!date || !timeSlot) {
    throw new Error('date and timeSlot are required (or slotDate and slotTime)')
  }
  const d = toDateFromInput(date)
  if (!d) throw new Error('Invalid appointment date')
  const slotDateOut = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
  return { slotDate: slotDateOut, slotTime: String(timeSlot).trim() }
}

export async function getPatientAppointments(req, res) {
  return getMyAppointments(req, res)
}

export async function getPatientHistory(req, res) {
  return getMyHistory(req, res)
}

export async function getPatientPrescriptions(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const patientId = await resolvePatientId({ user_id: userId })
    const history = await fetchHistoryForPatient(patientId, userId, {})

    const prescriptions = []
    for (const entry of history) {
      for (const rx of entry.prescriptions || []) {
        prescriptions.push({
          id: `${entry.id}-${rx.medicine_name}`,
          medical_history_id: entry.id,
          visit_date: entry.created_at,
          doctor_name: entry.doctor_name,
          diagnosis: entry.diagnosis,
          medicine_name: rx.medicine_name,
          dosage: rx.dosage,
          duration: rx.duration,
          instructions: rx.instructions,
          created_at: entry.created_at,
        })
      }
    }

    prescriptions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return res.json({
      success: true,
      prescriptions,
      read_only: true,
    })
  } catch (err) {
    console.error('getPatientPrescriptions:', err)
    return res.status(500).json({ message: err.message || 'Failed to load prescriptions' })
  }
}

export async function bookAppointment(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const doctorId = req.body.doctorId || req.body.docId
    const clinicId = req.body.clinicId || null
    const { symptoms, disease, diseaseQuery } = req.body

    const { slotDate, slotTime } = parseSlotFromBooking(req.body)

    const result = await bookAppointmentForPatient({
      userId,
      docId: doctorId,
      slotDate,
      slotTime,
      symptoms,
      diseaseQuery: diseaseQuery || disease || null,
      clinicId,
    })

    if (!result.success) {
      return res.status(400).json(result)
    }

    return res.status(201).json({
      success: true,
      message: result.message,
      appointmentId: result.appointmentId,
    })
  } catch (err) {
    console.error('bookAppointment:', err)
    return res.status(500).json({ success: false, message: err.message || 'Booking failed' })
  }
}

export async function uploadPayment(req, res) {
  req.body = {
    ...req.body,
    userId: req.user?.id,
    appointmentId: req.body.appointmentId,
    paymentMethod: req.body.paymentMethod || req.body.method || 'manual',
    reference: req.body.reference || req.body.transactionId,
  }
  return paymentManual(req, res)
}

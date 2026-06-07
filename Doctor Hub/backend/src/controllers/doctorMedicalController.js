import supabase from '../config/supabase.js'
import {
  resolvePatientId,
  insertMedicalHistory,
  insertPrescriptionRows,
  fetchHistoryForPatient,
} from '../utils/medicalHistoryRows.js'
import {
  loadDoctorAppointment,
  isClinicalEligibleAppointment,
} from '../middleware/assertDoctorAppointment.js'
import { resolveDoctorContextIdsOrCreate } from '../utils/appointmentDoctorRows.js'

function normalizeMedicines(medicines) {
  if (!Array.isArray(medicines) || !medicines.length) {
    throw new Error('medicines array is required')
  }
  return medicines.map((m) => {
    const name = (m.name || m.medicine_name || '').trim()
    if (!name) throw new Error('Each medicine needs a name')
    const frequency = m.frequency?.trim()
    const extraInstr = [frequency && `Frequency: ${frequency}`, m.instructions?.trim()]
      .filter(Boolean)
      .join('. ')
    return {
      medicine_name: name,
      dosage: m.dosage?.trim() || '—',
      duration: m.duration?.trim() || '—',
      instructions: extraInstr || '—',
    }
  })
}

async function historyHasPrescription(historyId) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('medical_history_id', historyId)
    .limit(1)

  if (error && !/column|does not exist/i.test(error.message || '')) throw error
  return (data || []).length > 0
}

export async function createDoctorMedicalHistory(req, res) {
  try {
    const appointmentId = req.body.appointmentId || req.body.appointment_id
    const patientIdBody = req.body.patientId || req.body.patient_id
    const { symptoms, diagnosis, notes } = req.body

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required' })
    }
    if (!diagnosis?.trim()) {
      return res.status(400).json({ success: false, message: 'diagnosis is required' })
    }

    const { appt, doctorRowId, contextUserId } = await loadDoctorAppointment(req, appointmentId)

    if (!isClinicalEligibleAppointment(appt)) {
      return res.status(400).json({
        success: false,
        message: 'Medical records can only be added for confirmed or completed appointments',
      })
    }

    let patientId = patientIdBody || appt.patient_id || null
    let linkedUserId = appt.user_id || null
    if (!patientId && linkedUserId) {
      patientId = await resolvePatientId({ user_id: linkedUserId })
    }
    if (!linkedUserId && patientId) {
      const { data: patRow } = await supabase
        .from('patients')
        .select('user_id')
        .eq('id', patientId)
        .maybeSingle()
      if (patRow?.user_id) linkedUserId = patRow.user_id
    }

    if (!patientId && !linkedUserId) {
      return res.status(400).json({ success: false, message: 'patientId could not be resolved' })
    }

    const notesCombined = [symptoms?.trim() && `Symptoms: ${symptoms.trim()}`, notes?.trim()]
      .filter(Boolean)
      .join('\n\n')

    const historyId = await insertMedicalHistory({
      patientId,
      userId: linkedUserId,
      doctorId: doctorRowId,
      appointmentId,
      symptoms: symptoms?.trim() || null,
      diagnosis: diagnosis.trim(),
      notes: notesCombined || diagnosis.trim(),
    })

    return res.status(201).json({
      success: true,
      message: 'Medical history record created',
      historyId,
      medicalHistoryId: historyId,
    })
  } catch (err) {
    console.error('createDoctorMedicalHistory:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to add medical history',
    })
  }
}

export async function getDoctorPatientMedicalHistory(req, res) {
  try {
    const contextUserId = req.user?.id
    const patientParam = req.params.patientId

    if (!contextUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
    if (!doctorRowId) {
      return res.status(403).json({ success: false, message: 'Doctor profile not found' })
    }

    const patientId =
      (await resolvePatientId({ patient_id: patientParam, user_id: patientParam })) ||
      patientParam

    const history = await fetchHistoryForPatient(patientId, null, {})

    return res.json({
      success: true,
      patientId,
      history,
      read_only: false,
      append_only: true,
    })
  } catch (err) {
    console.error('getDoctorPatientMedicalHistory:', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load medical history',
    })
  }
}

export async function createDoctorPrescription(req, res) {
  try {
    const {
      patientId: patientIdBody,
      appointmentId,
      medicalHistoryId,
      medicines,
      instructions,
    } = req.body

    if (!medicalHistoryId) {
      return res.status(400).json({ success: false, message: 'medicalHistoryId is required' })
    }
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required' })
    }

    const { appt, doctorRowId } = await loadDoctorAppointment(req, appointmentId)

    if (!isClinicalEligibleAppointment(appt)) {
      return res.status(400).json({
        success: false,
        message: 'Prescriptions can only be added for confirmed or completed appointments',
      })
    }

    const { data: history, error: histErr } = await supabase
      .from('medical_history')
      .select('*')
      .eq('id', medicalHistoryId)
      .maybeSingle()

    if (histErr) throw histErr
    if (!history) {
      return res.status(404).json({ success: false, message: 'Medical history record not found' })
    }
    if (history.doctor_id && history.doctor_id !== doctorRowId) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    if (await historyHasPrescription(medicalHistoryId)) {
      return res.status(409).json({
        success: false,
        message: 'A prescription already exists for this visit. Prescriptions cannot be edited.',
        code: 'PRESCRIPTION_IMMUTABLE',
      })
    }

    const normalized = normalizeMedicines(medicines)
    if (instructions?.trim()) {
      normalized[0].instructions = [normalized[0].instructions, instructions.trim()]
        .filter((x) => x && x !== '—')
        .join('. ')
    }

    let patientId = patientIdBody || history.patient_id || appt.patient_id
    if (!patientId && history.user_id) {
      patientId = await resolvePatientId({ user_id: history.user_id })
    }

    const count = await insertPrescriptionRows(medicalHistoryId, normalized, {
      patientId,
      doctorId: doctorRowId,
      appointmentId,
      generalInstructions: instructions?.trim() || null,
    })

    return res.status(201).json({
      success: true,
      message: 'Prescription created — it cannot be edited after submission',
      count,
      immutable: true,
    })
  } catch (err) {
    console.error('createDoctorPrescription:', err)
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Failed to create prescription',
    })
  }
}

export async function getDoctorPatientPrescriptions(req, res) {
  try {
    const contextUserId = req.user?.id
    const patientParam = req.params.patientId

    if (!contextUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
    if (!doctorRowId) {
      return res.status(403).json({ success: false, message: 'Doctor profile not found' })
    }

    const patientId =
      (await resolvePatientId({ patient_id: patientParam, user_id: patientParam })) ||
      patientParam

    const history = await fetchHistoryForPatient(patientId, null, { doctorId: doctorRowId })

    const prescriptions = []
    for (const entry of history) {
      for (const rx of entry.prescriptions || []) {
        prescriptions.push({
          id: `${entry.id}-${rx.medicine_name}`,
          medical_history_id: entry.id,
          appointment_id: entry.appointment_id,
          visit_date: entry.created_at,
          diagnosis: entry.diagnosis,
          ...rx,
        })
      }
    }

    prescriptions.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))

    return res.json({
      success: true,
      patientId,
      prescriptions,
      immutable: true,
    })
  } catch (err) {
    console.error('getDoctorPatientPrescriptions:', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load prescriptions',
    })
  }
}

export function forbidPrescriptionMutation(req, res) {
  return res.status(403).json({
    success: false,
    message: 'Prescriptions cannot be edited or deleted after creation',
  })
}

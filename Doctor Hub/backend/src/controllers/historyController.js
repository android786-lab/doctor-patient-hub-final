import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import supabase from '../config/supabase.js'
import { localPatientReportUrl } from '../../middlewares/patientReportUpload.js'
import {
  resolvePatientId,
  insertMedicalHistory,
  insertPrescriptionRows,
  fetchHistoryForPatient,
  insertPatientReport,
  fetchHistoryEntryById,
} from '../utils/medicalHistoryRows.js'
import {
  appointmentBelongsToDoctor,
  resolveDoctorContextIdsOrCreate,
} from '../utils/appointmentDoctorRows.js'
import { fetchAttachmentBuffer, resolveLocalUploadPath } from '../utils/attachmentFetch.js'
import { buildPrescriptionPdfBuffer } from '../utils/prescriptionPdf.js'
import { resolveUserDisplay } from '../utils/authUserRows.js'

const __historyDir = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__historyDir, '../..')

function safeAttachmentFilename(name, mime) {
  let n = String(name || 'report').replace(/[/\\?%*:|"<>]/g, '_').trim() || 'report'
  if (/\.[a-z0-9]{2,8}$/i.test(n)) return n
  if (mime === 'application/pdf') return `${n}.pdf`
  if (mime === 'image/png') return `${n}.png`
  if (mime === 'image/webp') return `${n}.webp`
  return `${n}.jpg`
}

function mimeFromFilename(filename, fallback) {
  const ext = path.extname(filename || '').toLowerCase()
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg'
  return fallback || 'application/octet-stream'
}

function sendAttachmentBuffer(res, buffer, filename, contentType) {
  let type = contentType
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('utf8') === '%PDF') {
    type = 'application/pdf'
  }
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.send(buffer)
}

async function assertCanAccessHistoryEntry(req, entry) {
  const userId = req.user?.id
  if (!userId) {
    const err = new Error('Authentication required')
    err.status = 401
    throw err
  }
  const role = req.user?.role
  if (role === 'patient') {
    const patientId = await resolvePatientId({ user_id: userId })
    const allowed = await fetchHistoryForPatient(patientId, userId, {})
    if (!allowed.some((h) => h.id === entry.id)) {
      const err = new Error('Access denied')
      err.status = 403
      throw err
    }
    return
  }
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(userId)
  if (!doctorRowId) {
    const err = new Error('Doctor profile not found')
    err.status = 403
    throw err
  }
  if (entry.record_type === 'patient_report') return
  if (entry.doctor_id && entry.doctor_id !== doctorRowId) {
    const err = new Error('Access denied')
    err.status = 403
    throw err
  }
}

export function forbidHistoryDelete(_req, res) {
  return res.status(403).json({ message: 'Medical history cannot be deleted' })
}

export function forbidHistoryModify(_req, res) {
  return res.status(403).json({ message: 'Medical history cannot be modified' })
}

export async function createHistory(req, res) {
  try {
    const contextUserId = req.user?.id
    const { patient_id, user_id, appointment_id, symptoms, diagnosis, notes } = req.body

    if (!contextUserId) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    if (!diagnosis?.trim()) {
      return res.status(400).json({ message: 'diagnosis is required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
    if (!doctorRowId) {
      return res.status(403).json({ message: 'Doctor profile not found' })
    }

    let patientId = await resolvePatientId({ patient_id, user_id })
    let linkedUserId = user_id

    if (appointment_id) {
      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointment_id)
        .maybeSingle()

      if (apptErr) throw apptErr
      if (!appt || !appointmentBelongsToDoctor(appt, doctorRowId, contextUserId)) {
        return res.status(403).json({ message: 'Invalid appointment' })
      }

      if (!patientId) {
        patientId = appt.patient_id || null
        if (!patientId && appt.user_id) {
          patientId = await resolvePatientId({ user_id: appt.user_id })
        }
      }
      if (!linkedUserId && appt.user_id) linkedUserId = appt.user_id
      if (!linkedUserId && patientId) {
        const { data: patRow } = await supabase
          .from('patients')
          .select('user_id')
          .eq('id', patientId)
          .maybeSingle()
        if (patRow?.user_id) linkedUserId = patRow.user_id
      }
    }

    if (!patientId && !linkedUserId) {
      return res.status(400).json({ message: 'patient_id or user_id is required' })
    }

    const historyId = await insertMedicalHistory({
      patientId,
      userId: linkedUserId,
      doctorId: doctorRowId,
      appointmentId: appointment_id,
      symptoms: symptoms?.trim() || null,
      diagnosis: diagnosis.trim(),
      notes: notes?.trim() || diagnosis.trim(),
    })

    return res.status(201).json({
      message: 'Record added',
      historyId,
    })
  } catch (err) {
    console.error('createHistory:', err)
    return res.status(500).json({ message: err.message || 'Failed to add record' })
  }
}

export async function addPrescriptions(req, res) {
  try {
    const contextUserId = req.user?.id
    const { historyId } = req.params
    const { prescriptions, appointment_id: bodyAppointmentId } = req.body

    if (!contextUserId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
    if (!doctorRowId) {
      return res.status(403).json({ message: 'Doctor profile not found' })
    }
    if (!Array.isArray(prescriptions) || prescriptions.length === 0) {
      return res.status(400).json({ message: 'prescriptions array is required' })
    }

    for (const p of prescriptions) {
      if (!p.medicine_name?.trim()) {
        return res.status(400).json({ message: 'Each prescription needs medicine_name' })
      }
    }

    const { data: history, error: histErr } = await supabase
      .from('medical_history')
      .select('*')
      .eq('id', historyId)
      .maybeSingle()

    if (histErr) throw histErr
    if (!history) {
      return res.status(404).json({ message: 'Medical history record not found' })
    }
    if (history.doctor_id && history.doctor_id !== doctorRowId) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const normalized = prescriptions.map((p) => ({
      medicine_name: p.medicine_name.trim(),
      dosage: p.dosage?.trim() || '',
      duration: p.duration?.trim() || '',
      instructions: p.instructions?.trim() || '',
    }))

    let patientIdForRx = history.patient_id
    if (!patientIdForRx && history.user_id) {
      patientIdForRx = await resolvePatientId({ user_id: history.user_id })
    }

    const count = await insertPrescriptionRows(historyId, normalized, {
      patientId: patientIdForRx,
      doctorId: doctorRowId,
      appointmentId: history.appointment_id ?? bodyAppointmentId ?? null,
    })

    return res.status(201).json({
      message: 'Prescriptions added',
      count,
    })
  } catch (err) {
    console.error('addPrescriptions:', err)
    return res.status(500).json({ message: err.message || 'Failed to add prescriptions' })
  }
}

export async function getMyHistory(req, res) {
  try {
    const userId = req.user?.id
    const patientId = await resolvePatientId({ user_id: userId })

    if (!patientId && !userId) {
      return res.json({ history: [] })
    }

    const history = await fetchHistoryForPatient(patientId, userId, {})
    return res.json({ history })
  } catch (err) {
    console.error('getMyHistory:', err)
    return res.status(500).json({ message: err.message || 'Failed to load history' })
  }
}

export async function getPatientHistory(req, res) {
  try {
    const contextUserId = req.user?.id
    const { patientId: patientParam } = req.params

    if (!contextUserId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
    if (!doctorRowId) {
      return res.status(403).json({ message: 'Doctor profile not found' })
    }

    const patientId =
      (await resolvePatientId({ patient_id: patientParam })) || patientParam

    // Full patient timeline: doctor visits + patient-uploaded lab reports
    const history = await fetchHistoryForPatient(patientId, null, {})
    return res.json({ success: true, history })
  } catch (err) {
    console.error('getPatientHistory:', err)
    return res.status(500).json({ message: err.message || 'Failed to load history' })
  }
}

/** Legacy CareLink list */
export async function legacyListHistory(req, res) {
  try {
    const userId = req.body?.userId || req.user?.id
    const history = await fetchHistoryForPatient(null, userId, {})
    return res.json({ success: true, history })
  } catch (err) {
    return res.json({ success: false, message: err.message })
  }
}

export async function uploadPatientReport(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const title = (req.body.title || '').trim()
    const description = (req.body.description || '').trim()
    if (!title) {
      return res.status(400).json({ message: 'Report title is required' })
    }

    const files = req.files || []
    if (!files.length) {
      return res.status(400).json({ message: 'Upload at least one lab report or image' })
    }

    const attachments = []
    for (const file of files) {
      const url = localPatientReportUrl(file)
      if (!url) {
        return res.status(500).json({ message: 'Could not save report on server. Try again.' })
      }
      attachments.push({
        url,
        name: safeAttachmentFilename(file.originalname, file.mimetype),
        type: file.mimetype || mimeFromFilename(file.originalname, 'application/octet-stream'),
        size: file.size,
        uploaded_at: new Date().toISOString(),
      })
    }

    const patientId = await resolvePatientId({ user_id: userId })
    const historyId = await insertPatientReport({
      patientId,
      userId,
      title,
      description: description || title,
      attachments,
    })

    return res.status(201).json({
      message: 'Report uploaded successfully',
      historyId,
      attachments,
    })
  } catch (err) {
    console.error('uploadPatientReport:', err)
    return res.status(500).json({ message: err.message || 'Failed to upload report' })
  }
}

export async function downloadPatientAttachment(req, res) {
  try {
    const { historyId, index } = req.params
    const idx = Number.parseInt(index, 10)
    if (!Number.isFinite(idx) || idx < 0) {
      return res.status(400).json({ message: 'Invalid attachment index' })
    }

    const entry = await fetchHistoryEntryById(historyId)
    if (!entry) {
      return res.status(404).json({ message: 'Record not found' })
    }

    await assertCanAccessHistoryEntry(req, entry)

    const att = entry.attachments?.[idx]
    if (!att?.url) {
      return res.status(404).json({ message: 'Attachment not found' })
    }

    const filename = safeAttachmentFilename(att.name, att.type)
    const contentType = att.type || mimeFromFilename(filename, 'application/octet-stream')

    const localPath = resolveLocalUploadPath(att.url)
    if (localPath) {
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.sendFile(path.resolve(localPath))
    }

    if (att.url.startsWith('data:')) {
      const match = att.url.match(/^data:([^;]+);base64,(.+)$/s)
      if (!match) {
        return res.status(400).json({ message: 'Invalid attachment data' })
      }
      const buffer = Buffer.from(match[2], 'base64')
      return sendAttachmentBuffer(res, buffer, filename, match[1] || contentType)
    }

    const buffer = await fetchAttachmentBuffer(att.url, att)
    if (!buffer) {
      return res.status(502).json({
        message:
          'Could not fetch file from storage. Ask the patient to upload the report again.',
      })
    }
    return sendAttachmentBuffer(res, buffer, filename, contentType)
  } catch (err) {
    console.error('downloadPatientAttachment:', err)
    const status = err.status || 500
    return res.status(status).json({ message: err.message || 'Download failed' })
  }
}

export async function getHistoryByAppointment(req, res) {
  try {
    const contextUserId = req.user?.id
    const { appointmentId } = req.params

    if (!contextUserId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
    if (!doctorRowId) {
      return res.status(403).json({ message: 'Doctor profile not found' })
    }

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle()

    if (apptErr) throw apptErr
    if (!appt || !appointmentBelongsToDoctor(appt, doctorRowId, contextUserId)) {
      return res.status(403).json({ message: 'Invalid appointment' })
    }

    let patientId = appt.patient_id || null
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

    const history = await fetchHistoryForPatient(patientId, linkedUserId, {})

    let patientName = appt.user_data?.name || 'Patient'
    if (linkedUserId) {
      const { data: u } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', linkedUserId)
        .maybeSingle()
      if (u?.name) patientName = u.name
      else if (u?.email) patientName = u.email.split('@')[0]
    }

    return res.json({
      appointment_id: appointmentId,
      patient: {
        id: patientId,
        user_id: linkedUserId,
        name: patientName,
      },
      history,
    })
  } catch (err) {
    console.error('getHistoryByAppointment:', err)
    return res.status(500).json({ message: err.message || 'Failed to load patient history' })
  }
}

export async function downloadPrescriptionPdf(req, res) {
  try {
    const userId = req.user?.id
    const { historyId } = req.params
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const entry = await fetchHistoryEntryById(historyId)
    if (!entry) {
      return res.status(404).json({ message: 'Record not found' })
    }

    if (entry.record_type === 'patient_report') {
      return res.status(400).json({ message: 'PDF is only available for doctor prescriptions' })
    }

    const role = req.user?.role
    const isPatient = role === 'patient'
    if (isPatient) {
      const patientId = await resolvePatientId({ user_id: userId })
      const allowed = await fetchHistoryForPatient(patientId, userId, {})
      if (!allowed.some((h) => h.id === historyId)) {
        return res.status(403).json({ message: 'Access denied' })
      }
    } else {
      const { doctorRowId } = await resolveDoctorContextIdsOrCreate(userId)
      if (!doctorRowId) {
        return res.status(403).json({ message: 'Doctor profile not found' })
      }
      if (entry.doctor_id && entry.doctor_id !== doctorRowId) {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    if (!entry.prescriptions?.length) {
      return res.status(400).json({ message: 'No prescriptions on this record' })
    }

    const { data: histRow } = await supabase
      .from('medical_history')
      .select('patient_id, user_id')
      .eq('id', historyId)
      .maybeSingle()

    let patientName = 'Patient'
    if (histRow?.user_id) {
      const display = await resolveUserDisplay({ id: histRow.user_id })
      patientName = display.name
    }

    const pdfBuffer = await buildPrescriptionPdfBuffer({
      doctorName: entry.doctor_name,
      doctorSpecialization: entry.doctor_specialization,
      patientName,
      diagnosis: entry.diagnosis,
      notes: entry.notes,
      prescriptions: entry.prescriptions,
      issuedAt: new Date(entry.created_at),
    })

    const filename = `prescription-${historyId.slice(0, 8)}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(pdfBuffer)
  } catch (err) {
    console.error('downloadPrescriptionPdf:', err)
    return res.status(500).json({ message: err.message || 'Failed to generate PDF' })
  }
}

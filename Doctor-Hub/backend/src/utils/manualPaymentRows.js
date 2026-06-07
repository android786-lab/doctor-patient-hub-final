import supabase from '../config/supabase.js'
import { resolvePatientId } from './medicalHistoryRows.js'
import { resolveAppointmentPayAmount } from './bookAppointmentRows.js'
import { uploadPaymentProof } from './imageUpload.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

async function appointmentOwnedByUser(appointment, userId) {
  if (appointment.user_id === userId) return true
  const patientId = await resolvePatientId({ user_id: userId })
  return patientId && appointment.patient_id === patientId
}

async function uploadProofImage(file) {
  if (!file?.path && !file?.buffer?.length) {
    throw new Error('Screenshot file is required')
  }
  return uploadPaymentProof(file)
}

async function patchAppointment(appointmentId, patches) {
  let lastError = null
  for (const patch of patches) {
    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    )
    const { error } = await supabase.from('appointments').update(cleaned).eq('id', appointmentId)
    if (!error) return
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  if (lastError) throw lastError
}

async function upsertPaymentRecord(appointmentId, { amount, method, proofUrl, reference }) {
  const row = {
    appointment_id: appointmentId,
    amount: amount || 0,
    currency: (process.env.CURRENCY || 'pkr').toLowerCase(),
    status: 'pending',
    method,
    proof_url: proofUrl,
    reference: reference || null,
  }

  const { error: insertErr } = await supabase.from('payments').insert(row)
  if (!insertErr) return

  if (/duplicate|unique/i.test(insertErr.message || '')) {
    const { error: updateErr } = await supabase
      .from('payments')
      .update({
        amount: row.amount,
        method,
        proof_url: proofUrl,
        reference: reference || null,
        status: 'pending',
      })
      .eq('appointment_id', appointmentId)
    if (!updateErr) return
    if (!isMissingColumn(updateErr)) throw updateErr
  }

  if (!/relation.*does not exist|column/i.test(insertErr.message || '')) {
    if (!isMissingColumn(insertErr)) throw insertErr
  }
}

export async function submitManualPaymentProof({
  userId,
  appointmentId,
  paymentMethod,
  reference,
  imageFile,
}) {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (error || !appointment) {
    throw new Error('Appointment not found')
  }
  if (appointment.cancelled || appointment.status === 'cancelled') {
    throw new Error('Appointment was cancelled')
  }
  if (appointment.status === 'confirmed') {
    throw new Error('This appointment is already confirmed')
  }
  if (!(await appointmentOwnedByUser(appointment, userId))) {
    throw new Error('Unauthorized')
  }
  if (
    appointment.payment_proof_url ||
    appointment.status === 'awaiting_verification' ||
    appointment.status === 'payment_uploaded'
  ) {
    throw new Error('Payment proof already submitted — waiting for admin approval')
  }

  const proofUrl = await uploadProofImage(imageFile)
  const amount = await resolveAppointmentPayAmount(appointment)
  const method = String(paymentMethod || 'manual').trim()

  // Use awaiting_verification — valid on appointment_status enum (001 schema)
  await patchAppointment(appointmentId, [
    {
      status: 'awaiting_verification',
      payment_method: method,
      payment_proof_url: proofUrl,
      payment_reference: reference || null,
    },
    {
      status: 'awaiting_verification',
      payment_proof_url: proofUrl,
      payment_method: method,
    },
    {
      payment_proof_url: proofUrl,
      payment_method: method,
      payment_reference: reference || null,
    },
  ])

  if (proofUrl && !String(proofUrl).startsWith('data:')) {
    try {
      await upsertPaymentRecord(appointmentId, {
        amount,
        method,
        proofUrl,
        reference,
      })
    } catch (e) {
      console.warn('payments table update skipped:', e.message)
    }
  }

  try {
    const { notifyFromAppointmentRow } = await import('../services/notificationService.js')
    await notifyFromAppointmentRow(
      { id: appointmentId, user_id: userId, ...appointment },
      'payment_uploaded'
    )
  } catch (notifyErr) {
    console.warn('Payment proof notification skipped:', notifyErr.message)
  }

  return {
    success: true,
    message: 'Payment proof submitted — our team will verify and confirm your appointment',
    proofUrl,
  }
}

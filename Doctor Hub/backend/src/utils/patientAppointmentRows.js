import supabase from '../config/supabase.js'
import { resolvePatientId } from './medicalHistoryRows.js'

const PLACEHOLDER_PREFIX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemS'

function isUsablePhoto(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false
  if (trimmed.startsWith(PLACEHOLDER_PREFIX)) return false
  if (trimmed.startsWith('data:') && trimmed.length < 250) return false
  return true
}

function pickPhoto(...candidates) {
  for (const url of candidates) {
    if (isUsablePhoto(url)) return url.trim()
  }
  return null
}

function normalizeAddress(addr) {
  if (!addr) return null
  if (typeof addr === 'string' && addr.trim()) return { line1: addr.trim(), line2: '' }
  if (typeof addr !== 'object') return null
  const line1 = (addr.line1 || addr.street || '').trim()
  const line2 = (addr.line2 || '').trim()
  const city = (addr.city || '').trim()
  if (!line1 && !line2 && !city) return null
  return { line1: line1 || city, line2: line2 || (city && line1 ? city : ''), city }
}

export async function fetchPatientAppointments(userId) {
  let rows = []

  const byUser = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!byUser.error) rows = byUser.data || []
  else if (!/user_id|column/i.test(byUser.error.message)) throw byUser.error

  if (!rows.length) {
    const patientId = await resolvePatientId({ user_id: userId })
    if (patientId) {
      const byPatient = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
      if (!byPatient.error) rows = byPatient.data || []
      else if (!/patient_id|column/i.test(byPatient.error.message)) throw byPatient.error
    }
  }

  return rows
}

async function loadDoctorLabels(doctorIds) {
  const unique = [...new Set(doctorIds.filter(Boolean))]
  if (!unique.length) return {}

  const attempts = [
    'id, user_id, name, image, speciality, specialization, degree, address, fees, consultation_fee, profile_image, full_name',
    'id, user_id, full_name, specialization, profile_image, consultation_fee',
    'id, name, image, speciality, address, fees',
  ]

  let doctors = []
  for (const sel of attempts) {
    const { data, error } = await supabase.from('doctors').select(sel).in('id', unique)
    if (error) continue
    doctors = data || []
    break
  }

  if (!doctors.length) return {}

  const userIds = [...new Set(doctors.map((d) => d.user_id).filter(Boolean))]
  const userAddresses = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, address').in('id', userIds)
    for (const u of users || []) {
      const norm = normalizeAddress(u.address)
      if (norm) userAddresses[u.id] = norm
    }
  }

  return Object.fromEntries(
    doctors.map((d) => {
      const name = d.full_name || d.name || 'Doctor'
      const address =
        normalizeAddress(d.address) ||
        (d.user_id ? userAddresses[d.user_id] : null) ||
        null
      return [
        d.id,
        {
          name,
          image: pickPhoto(d.profile_image, d.image),
          speciality: d.specialization || d.speciality || 'General physician',
          degree: d.degree || null,
          address,
          fees: d.consultation_fee ?? d.fees ?? 0,
        },
      ]
    })
  )
}

function slotFromScheduled(scheduledAt) {
  if (!scheduledAt) return { slot_date: '', slot_time: '—' }
  const scheduled = new Date(scheduledAt)
  return {
    slot_date: `${scheduled.getDate()}_${scheduled.getMonth() + 1}_${scheduled.getFullYear()}`,
    slot_time: scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

/** CareLink patient UI expects doc_data, slot_date, payment, cancelled, is_completed. */
export async function mapAppointmentsForPatientUi(rows) {
  const doctorIds = rows.map((r) => r.doc_id || r.doctor_id).filter(Boolean)
  const doctorLabels = await loadDoctorLabels(doctorIds)

  return rows.map((row) => {
    const doctorId = row.doc_id || row.doctor_id
    const fresh = doctorId ? doctorLabels[doctorId] : null

    if (row.doc_data?.name) {
      const merged = {
        ...row.doc_data,
        ...(fresh || {}),
        name: row.doc_data.name || fresh?.name,
        image: pickPhoto(row.doc_data.image, row.doc_data.profile_image, fresh?.image),
        speciality:
          row.doc_data.speciality ||
          row.doc_data.specialization ||
          fresh?.speciality ||
          'General physician',
        address:
          normalizeAddress(row.doc_data.address) ||
          fresh?.address ||
          null,
      }
      return {
        ...row,
        doc_data: merged,
        payment:
          row.payment === true ||
          row.status === 'confirmed' ||
          row.status === 'completed' ||
          row.status === 'awaiting_verification' ||
          row.status === 'payment_uploaded',
        cancelled: row.cancelled === true || row.status === 'cancelled',
        is_completed: row.is_completed === true || row.status === 'completed',
      }
    }

    const doc = fresh || {
      name: 'Doctor',
      image: null,
      speciality: 'General physician',
      address: null,
    }
    const { slot_date, slot_time } = row.slot_date
      ? { slot_date: row.slot_date, slot_time: row.slot_time || '—' }
      : slotFromScheduled(row.scheduled_at)

    return {
      ...row,
      doc_id: doctorId,
      slot_date,
      slot_time,
      doc_data: doc,
      amount: row.amount ?? doc.fees ?? 0,
      payment:
        row.payment === true ||
        row.status === 'confirmed' ||
        row.status === 'completed' ||
        row.status === 'awaiting_verification' ||
        row.status === 'payment_uploaded',
      cancelled: row.cancelled === true || row.status === 'cancelled',
      is_completed: row.is_completed === true || row.status === 'completed',
    }
  })
}

export async function listPatientAppointmentsForUser(userId) {
  const rows = await fetchPatientAppointments(userId)
  return mapAppointmentsForPatientUi(rows)
}

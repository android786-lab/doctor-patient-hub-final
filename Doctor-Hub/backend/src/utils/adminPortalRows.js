import supabase from '../config/supabase.js'
import { loadProfiles } from './doctorRows.js'
import { toDateFromInput } from './parseDateInput.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

async function selectWithFallback(table, attempts, orderColumn = 'created_at') {
  let lastError = null
  for (const columns of attempts) {
    const orderTries = orderColumn ? [true, false] : [false]
    for (const useOrder of orderTries) {
      let q = supabase.from(table).select(columns)
      if (useOrder) q = q.order(orderColumn, { ascending: false })
      const { data, error } = await q
      if (!error) return data || []
      lastError = error
      if (!isMissingColumn(error)) throw error
    }
  }
  throw lastError || new Error(`Failed to load ${table}`)
}

export async function fetchDoctorsForAdmin() {
  const rows = await selectWithFallback('doctors', [
    'id, user_id, full_name, email, specialization, is_verified, is_active, created_at',
    'id, user_id, full_name, specialization, is_verified, is_active, created_at',
    'id, user_id, full_name, is_verified, is_active, created_at',
    'id, name, email, speciality, specialization, is_verified, is_active, created_at',
    'id, name, email, speciality, degree, experience, fees, available, date',
    '*',
  ])

  let profiles = {}
  const profileIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  if (profileIds.length) {
    try {
      profiles = await loadProfiles(profileIds)
    } catch {
      profiles = {}
    }
  }

  return rows.map((d) => ({
    id: d.id,
    name:
      d.full_name ||
      d.name ||
      (d.user_id && profiles[d.user_id]?.full_name) ||
      d.email ||
      'Doctor',
    email: d.email || null,
    is_verified: d.is_verified === true,
    is_active: d.is_active !== false,
    specialization: d.specialization || d.speciality || null,
    created_at: d.created_at || null,
  }))
}

async function loadDoctorIdentitySets() {
  const rows = await selectWithFallback(
    'doctors',
    ['id, user_id, email', 'id, user_id', 'id, email', 'id, name, email', '*'],
    null
  )
  const userIds = new Set()
  const emails = new Set()
  for (const d of rows) {
    if (d.user_id) userIds.add(d.user_id)
    const em = (d.email || '').toLowerCase().trim()
    if (em) emails.add(em)
  }
  return { userIds, emails }
}

function isPatientUser(u, doctorUserIds, doctorEmails) {
  const r = (u.role || 'patient').toLowerCase()
  if (['doctor', 'admin', 'super_admin', 'assistant'].includes(r)) return false
  if (doctorUserIds.has(u.id)) return false
  const em = (u.email || '').toLowerCase().trim()
  if (em && doctorEmails.has(em)) return false
  return true
}

export async function fetchPatientsForAdmin() {
  const { userIds: doctorUserIds, emails: doctorEmails } = await loadDoctorIdentitySets()

  try {
    const patientRows = await selectWithFallback('patients', [
      'id, user_id, full_name, phone, created_at',
      'id, user_id, full_name, created_at',
      'id, user_id, created_at',
      '*',
    ])

    if (patientRows.length) {
      const linkedUserIds = [...new Set(patientRows.map((p) => p.user_id).filter(Boolean))]
      let userMap = {}
      if (linkedUserIds.length) {
        const userRows = await selectWithFallback('users', [
          'id, name, email, role, created_at, is_active',
          'id, name, email, role, created_at',
          'id, name, email, created_at',
          '*',
        ])
        for (const u of userRows) {
          if (linkedUserIds.includes(u.id)) userMap[u.id] = u
        }
      }

      const seen = new Set()
      const list = []
      for (const p of patientRows) {
        if (p.user_id && doctorUserIds.has(p.user_id)) continue
        const u = p.user_id ? userMap[p.user_id] : null
        if (u && !isPatientUser(u, doctorUserIds, doctorEmails)) continue
        const rowId = p.user_id || p.id
        if (seen.has(rowId)) continue
        seen.add(rowId)
        list.push({
          id: rowId,
          name: p.full_name || u?.name || u?.email || 'Patient',
          email: u?.email || null,
          joined_at: p.created_at || u?.created_at,
          is_active: u?.is_active !== false,
        })
      }
      if (list.length) return list
    }
  } catch {
    /* fall back to users table */
  }

  const rows = await selectWithFallback('users', [
    'id, name, email, role, created_at, is_active',
    'id, name, email, role, created_at',
    'id, name, email, created_at',
    '*',
  ])

  return rows
    .filter((u) => isPatientUser(u, doctorUserIds, doctorEmails))
    .map((p) => ({
      id: p.id,
      name: p.name || p.email || 'Patient',
      email: p.email,
      joined_at: p.created_at,
      is_active: p.is_active !== false,
    }))
}

function effectiveRoleForUser(u, doctorUserIds, doctorEmails) {
  const email = (u.email || '').toLowerCase().trim()
  if (doctorUserIds.has(u.id)) return 'doctor'
  if (email && doctorEmails.has(email)) return 'doctor'
  return (u.role || 'patient').toLowerCase()
}

async function syncDoctorRoleInUsers(users, doctorUserIds, doctorEmails) {
  for (const u of users) {
    const effective = effectiveRoleForUser(u, doctorUserIds, doctorEmails)
    if (effective !== 'doctor') continue
    const stored = (u.role || 'patient').toLowerCase()
    if (stored === 'doctor') continue
    const { error } = await supabase.from('users').update({ role: 'doctor' }).eq('id', u.id)
    if (!error) u.role = 'doctor'
  }
}

export async function fetchAllUsersForAdmin() {
  const { userIds: doctorUserIds, emails: doctorEmails } = await loadDoctorIdentitySets()

  const rows = await selectWithFallback('users', [
    'id, name, email, role, is_active, created_at',
    'id, name, email, role, created_at',
    'id, name, email, created_at',
    '*',
  ])

  await syncDoctorRoleInUsers(rows, doctorUserIds, doctorEmails)

  return rows.map((u) => ({
    id: u.id,
    name: u.name || u.email || 'User',
    email: u.email,
    role: effectiveRoleForUser(u, doctorUserIds, doctorEmails),
    is_active: u.is_active !== false,
    created_at: u.created_at,
    is_doctor: doctorUserIds.has(u.id) || doctorEmails.has((u.email || '').toLowerCase().trim()),
  }))
}

export async function fetchAssistantsForAdmin() {
  try {
    const rows = await selectWithFallback('users', ['id, name, email, role'], null)
    return rows.filter((u) => u.role === 'assistant')
  } catch {
    return []
  }
}

export async function updateDoctorVerified(doctorId, verified = true) {
  const patch = verified
    ? { is_verified: true, is_active: true }
    : { is_verified: false }

  let { error } = await supabase.from('doctors').update(patch).eq('id', doctorId)

  if (!error) return

  if (isMissingColumn(error)) {
    const retry = await supabase
      .from('doctors')
      .update({ is_verified: verified })
      .eq('id', doctorId)
    if (retry.error) throw retry.error
    return
  }
  throw error
}

export async function fetchAllPaymentsForAdmin() {
  const attempts = [
    'id, appointment_id, amount, status, proof_url, screenshot_url, method, reference, verified_at, verified_by, created_at, uploaded_at',
    'id, appointment_id, amount, status, proof_url, method, reference, verified_at, created_at',
    'appointment_id, amount, status, proof_url, created_at',
  ]

  let payments = []
  for (const cols of attempts) {
    const { data, error } = await supabase
      .from('payments')
      .select(cols)
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error) {
      payments = data || []
      break
    }
    if (!isMissingColumn(error)) throw error
  }

  const apptIds = [...new Set(payments.map((p) => p.appointment_id).filter(Boolean))]
  let apptMap = {}
  if (apptIds.length) {
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, slot_date, slot_time, status, amount, patient_id, user_id, doc_id, doctor_id')
      .in('id', apptIds)
    apptMap = Object.fromEntries((appts || []).map((a) => [a.id, a]))
  }

  return payments.map((p) => {
    const appt = apptMap[p.appointment_id] || {}
    return {
      id: p.id || p.appointment_id,
      appointment_id: p.appointment_id,
      amount: Number(p.amount ?? appt.amount ?? 0),
      status: p.status || 'pending',
      screenshot_url: p.screenshot_url || p.proof_url || null,
      payment_method: p.method || null,
      reference: p.reference || null,
      verified_at: p.verified_at || null,
      appointment_status: appt.status || null,
      slot_date: appt.slot_date || null,
      slot_time: appt.slot_time || null,
      created_at: p.created_at || p.uploaded_at || null,
    }
  })
}

function parseSlotDateParts(slotDate) {
  if (!slotDate) return null
  const parts = String(slotDate).split('_')
  if (parts.length !== 3) return null
  return new Date(+parts[2], +parts[1] - 1, +parts[0])
}

export async function fetchAllAppointmentsForAdmin({ status, date } = {}) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  let rows = data || []

  if (status) {
    const s = status.toLowerCase()
    rows = rows.filter((r) => {
      if (s === 'cancelled') return r.cancelled || r.status === 'cancelled'
      return (r.status || 'pending').toLowerCase() === s
    })
  }

  if (date) {
    const target = toDateFromInput(date)
    if (!target) return rows
    const targetStr = target.toDateString()
    rows = rows.filter((r) => {
      if (r.appointment_date) {
        return new Date(r.appointment_date).toDateString() === targetStr
      }
      const slot = parseSlotDateParts(r.slot_date)
      if (slot) return slot.toDateString() === targetStr
      if (r.scheduled_at) {
        return new Date(r.scheduled_at).toDateString() === targetStr
      }
      if (r.created_at) {
        return new Date(r.created_at).toDateString() === targetStr
      }
      return false
    })
  }

  return rows
}

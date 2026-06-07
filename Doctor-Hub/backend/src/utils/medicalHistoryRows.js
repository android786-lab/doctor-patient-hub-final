import supabase from '../config/supabase.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === '42703' || err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

/** Parse Supabase/PostgREST "unknown column" errors so we can retry without that field. */
function missingColumnFromError(err, table = 'medical_history') {
  const msg = err?.message || ''
  let m = msg.match(new RegExp(`${table}\\.(\\w+) does not exist`, 'i'))
  if (m) return m[1]
  m = msg.match(/Could not find the '(\w+)' column of ['"]?[\w.]*medical_history['"]?/i)
  if (m) return m[1]
  m = msg.match(/column ["'](\w+)["'] of relation ["']medical_history["']/i)
  if (m) return m[1]
  return null
}

function stripMissingColumn(payload, err, table = 'medical_history') {
  const col = missingColumnFromError(err, table)
  if (!col || !(col in payload)) return null
  const { [col]: _removed, ...rest } = payload
  return rest
}

export async function resolvePatientId({ patient_id, user_id }) {
  if (patient_id) {
    const { data: byPk } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patient_id)
      .maybeSingle()
    if (byPk?.id) return byPk.id
    return patient_id
  }
  if (!user_id) return null

  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', user_id)
    .maybeSingle()

  if (data?.id) return data.id

  const { data: asId } = await supabase
    .from('patients')
    .select('id')
    .eq('id', user_id)
    .maybeSingle()

  return asId?.id || null
}

export async function insertMedicalHistory({
  patientId,
  userId,
  doctorId,
  appointmentId,
  symptoms,
  diagnosis,
  notes,
}) {
  let pid = patientId
  if (!pid && userId) {
    pid = await resolvePatientId({ user_id: userId })
  }
  if (!pid && userId) {
    throw new Error('Patient profile not found — patient must register before medical records can be added')
  }

  const title = (diagnosis || 'Consultation').slice(0, 200)
  const description = notes || diagnosis || ''

  const attempts = [
    {
      patient_id: pid,
      doctor_id: doctorId,
      title,
      description,
      diagnosis: diagnosis || null,
      symptoms: symptoms || null,
      notes: notes || null,
      appointment_id: appointmentId || null,
    },
    {
      patient_id: pid,
      doctor_id: doctorId,
      diagnosis: diagnosis || null,
      notes: notes || null,
    },
    {
      patient_id: pid,
      doctor_id: doctorId,
      diagnosis: diagnosis || null,
      notes: notes || null,
      appointment_id: appointmentId || null,
    },
    {
      user_id: userId,
      doctor_id: doctorId,
      title,
      description,
      diagnosis: diagnosis || null,
    },
  ]

  let lastError = null
  for (const base of attempts) {
    if (!base.patient_id && !base.user_id) continue
    let payload = { ...base }
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data, error } = await supabase
        .from('medical_history')
        .insert(payload)
        .select('id')
        .single()
      if (!error) return data.id
      lastError = error
      if (!isMissingColumn(error)) break
      const next = stripMissingColumn(payload, error)
      if (!next) break
      payload = next
    }
  }

  throw lastError || new Error('Failed to insert medical history')
}

export async function insertPrescriptionRows(historyId, items, meta = {}) {
  const legacyBase = {
    patient_id: meta.patientId,
    doctor_id: meta.doctorId,
    appointment_id: meta.appointmentId || null,
    medicines: items.map((p) => ({
      name: p.medicine_name,
      dosage: p.dosage,
      duration: p.duration,
      instructions: p.instructions,
    })),
    instructions: items.map((p) => p.instructions).filter(Boolean).join('; '),
    is_locked: true,
  }

  let legacy = { ...legacyBase }
  for (let attempt = 0; attempt < 6; attempt++) {
    const ins = await supabase.from('prescriptions').insert(legacy).select('id')
    if (!ins.error) return 1
    if (!isMissingColumn(ins.error)) break
    const match = (ins.error.message || '').match(/prescriptions\.(\w+) does not exist/i)
    if (!match) break
    const { [match[1]]: _drop, ...rest } = legacy
    if (Object.keys(rest).length === Object.keys(legacy).length) break
    legacy = rest
  }

  const rows = items.map((p) => ({
    medical_history_id: historyId,
    medicine_name: p.medicine_name,
    dosage: p.dosage,
    duration: p.duration,
    instructions: p.instructions,
  }))

  let { data, error } = await supabase.from('prescriptions').insert(rows).select('id')

  if (!error) return data?.length ?? items.length

  if (!/medical_history_id|column/i.test(error.message || '')) throw error

  legacy = { ...legacyBase }
  for (let attempt = 0; attempt < 6; attempt++) {
    const ins = await supabase.from('prescriptions').insert(legacy).select('id')
    if (!ins.error) return 1
    if (!isMissingColumn(ins.error)) throw ins.error
    const match = (ins.error.message || '').match(/prescriptions\.(\w+) does not exist/i)
    if (!match) throw ins.error
    const { [match[1]]: _drop, ...rest } = legacy
    if (Object.keys(rest).length === Object.keys(legacy).length) throw ins.error
    legacy = rest
  }

  throw new Error('Failed to insert prescriptions')
}

async function loadDoctorsMap(doctorIds) {
  if (!doctorIds.length) return {}
  const { data } = await supabase
    .from('doctors')
    .select('id, full_name, name, specialization, speciality, user_id')
    .in('id', doctorIds)

  const map = {}
  for (const d of data || []) {
    map[d.id] = d
  }

  const profileIds = [...new Set((data || []).map((d) => d.user_id).filter(Boolean))]
  if (profileIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', profileIds)
    const pmap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    for (const d of data || []) {
      if (d.user_id && pmap[d.user_id]) {
        map[d.id]._profileName = pmap[d.user_id].full_name
      }
    }
  }

  return map
}

function doctorDisplay(docRow) {
  if (!docRow) return { name: 'Doctor', specialization: null }
  return {
    name:
      docRow.full_name ||
      docRow.name ||
      docRow._profileName ||
      'Doctor',
    specialization: docRow.specialization || docRow.speciality || null,
  }
}

function rxRowsFromRecord(p) {
  if (p.medicine_name) {
    return [
      {
        medicine_name: p.medicine_name,
        dosage: p.dosage || '—',
        duration: p.duration || '—',
        instructions: p.instructions || '—',
      },
    ]
  }
  return expandLegacyMedicines(p)
}

function parseMedicinesField(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

async function loadPrescriptionsForHistory(historyIds, historyRows = []) {
  const grouped = {}
  if (!historyIds.length) return grouped

  const linkRes = await supabase
    .from('prescriptions')
    .select('*')
    .in('medical_history_id', historyIds)

  if (!linkRes.error && linkRes.data?.length) {
    for (const p of linkRes.data) {
      if (!p.medical_history_id) continue
      if (!grouped[p.medical_history_id]) grouped[p.medical_history_id] = []
      const row = { ...p, medicines: parseMedicinesField(p.medicines) }
      grouped[p.medical_history_id].push(...rxRowsFromRecord(row))
    }
  } else if (linkRes.error && !isMissingColumn(linkRes.error)) {
    throw linkRes.error
  }

  const patientIds = [...new Set(historyRows.map((r) => r.patient_id).filter(Boolean))]
  if (!patientIds.length) return grouped

  const legacyRes = await supabase.from('prescriptions').select('*').in('patient_id', patientIds)
  if (legacyRes.error && !isMissingColumn(legacyRes.error)) throw legacyRes.error

  const legacyRx = (legacyRes.data || []).map((rx) => ({
    ...rx,
    medicines: parseMedicinesField(rx.medicines),
  }))

  const usedRxIds = new Set()
  for (const row of historyRows) {
    if (grouped[row.id]?.length) continue

    const candidates = legacyRx
      .filter((rx) => {
        if (usedRxIds.has(rx.id)) return false
        if (row.patient_id && rx.patient_id && rx.patient_id !== row.patient_id) return false
        if (row.doctor_id && rx.doctor_id && rx.doctor_id !== row.doctor_id) return false
        if (row.appointment_id && rx.appointment_id) {
          return rx.appointment_id === row.appointment_id
        }
        const t0 = new Date(row.created_at).getTime()
        const t1 = new Date(rx.created_at).getTime()
        return Math.abs(t1 - t0) < 30 * 60 * 1000
      })
      .sort(
        (a, b) =>
          Math.abs(new Date(a.created_at) - new Date(row.created_at)) -
          Math.abs(new Date(b.created_at) - new Date(row.created_at))
      )

    const best = candidates[0]
    if (best) {
      usedRxIds.add(best.id)
      grouped[row.id] = rxRowsFromRecord(best)
    }
  }

  return grouped
}

function expandLegacyMedicines(rxRow) {
  const meds = parseMedicinesField(rxRow?.medicines)
  if (!meds.length) return []
  return meds.map((m) => ({
    medicine_name: m.name || m.medicine_name || 'Medicine',
    dosage: m.dosage || '—',
    duration: m.duration || '—',
    instructions: m.instructions || rxRow.instructions || '—',
  }))
}

export async function fetchHistoryForPatient(patientId, userId, { doctorId } = {}) {
  let rows = []

  if (patientId) {
    let q = supabase
      .from('medical_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    if (doctorId) q = q.eq('doctor_id', doctorId)
    const { data, error } = await q
    if (!error) rows = data || []
  }

  if (!rows.length && userId) {
    let q = supabase
      .from('medical_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (doctorId) q = q.eq('doctor_id', doctorId)
    const { data, error } = await q
    if (!error) rows = data || []
  }

  const historyIds = rows.map((r) => r.id)
  const rxByHistory = await loadPrescriptionsForHistory(historyIds, rows)

  const doctorIds = [...new Set(rows.map((r) => r.doctor_id).filter(Boolean))]
  const doctors = await loadDoctorsMap(doctorIds)

  return rows.map((row) => {
    const doc = doctorDisplay(doctors[row.doctor_id])
    let prescriptions = rxByHistory[row.id] || []

    if (!prescriptions.length) {
      prescriptions = expandLegacyMedicines(row)
    }

    const attachments = parseAttachmentsField(row.attachments)
    const recordType = row.record_type || 'doctor_visit'

    return {
      id: row.id,
      created_at: row.created_at,
      symptoms: row.symptoms || null,
      diagnosis: row.diagnosis || row.title || '—',
      notes: row.notes || row.description || '',
      appointment_id: row.appointment_id || null,
      doctor_id: row.doctor_id,
      doctor_name: recordType === 'patient_report' ? 'You (uploaded)' : doc.name,
      doctor_specialization: recordType === 'patient_report' ? null : doc.specialization,
      record_type: recordType,
      attachments,
      prescriptions,
      has_pdf: prescriptions.length > 0 && recordType === 'doctor_visit',
    }
  })
}

function parseAttachmentsField(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export async function insertPatientReport({
  patientId,
  userId,
  title,
  description,
  attachments = [],
}) {
  let pid = patientId
  if (!pid && userId) {
    pid = await resolvePatientId({ user_id: userId })
  }
  if (!pid && userId) {
    throw new Error('Patient profile not found. Complete registration first.')
  }

  const fullDescription = (description ? `${title} — ${description}` : title).slice(0, 4000)

  const payloadAttempts = [
    {
      patient_id: pid,
      title: title.slice(0, 200),
      description: fullDescription.slice(0, 4000),
      diagnosis: title,
      attachments,
      record_type: 'patient_report',
    },
    {
      patient_id: pid,
      user_id: userId,
      title: title.slice(0, 200),
      description: fullDescription.slice(0, 4000),
      diagnosis: title,
      attachments,
    },
    {
      patient_id: pid,
      title: title.slice(0, 200),
      description: fullDescription.slice(0, 4000),
      diagnosis: title,
    },
  ]

  let lastError = null
  for (const base of payloadAttempts) {
    if (!base.patient_id && !base.user_id) continue
    let payload = { ...base }
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data, error } = await supabase
        .from('medical_history')
        .insert(payload)
        .select('id')
        .single()
      if (!error) return data.id
      lastError = error
      if (!isMissingColumn(error)) break
      const next = stripMissingColumn(payload, error)
      if (!next) break
      payload = next
    }
  }

  throw lastError || new Error('Failed to save report')
}

export async function fetchHistoryEntryById(historyId) {
  const { data: row, error } = await supabase
    .from('medical_history')
    .select('*')
    .eq('id', historyId)
    .maybeSingle()
  if (error) throw error
  if (!row) return null

  const [entry] = await fetchHistoryForPatient(row.patient_id, row.user_id, {})
  return entry || null
}

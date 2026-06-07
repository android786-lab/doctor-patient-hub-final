import supabase from '../config/supabase.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function isForeignKeyError(err) {
  const msg = err?.message || ''
  return err?.code === '23503' || /foreign key|violates foreign key/i.test(msg)
}

export function appointmentDoctorRef(row) {
  return row?.doctor_id || row?.doc_id || null
}

/** JWT id may be doctors.id (CareLink) or users.id (Module 3). */
export async function resolveDoctorContextIds(contextUserId) {
  if (!contextUserId) return { doctorRowId: null, userId: null }

  const { data: byPk, error: byPkErr } = await supabase
    .from('doctors')
    .select('id, user_id')
    .eq('id', contextUserId)
    .maybeSingle()

  if (!byPkErr && byPk) {
    return { doctorRowId: byPk.id, userId: byPk.user_id || contextUserId }
  }

  if (!byPkErr || isMissingColumn(byPkErr)) {
    const { data: byUser, error: byUserErr } = await supabase
      .from('doctors')
      .select('id, user_id')
      .eq('user_id', contextUserId)
      .maybeSingle()

    if (!byUserErr && byUser) {
      return { doctorRowId: byUser.id, userId: contextUserId }
    }
    if (byUserErr && !isMissingColumn(byUserErr)) throw byUserErr
  } else {
    throw byPkErr
  }

  return { doctorRowId: null, userId: contextUserId }
}

/**
 * JWT may be public.users.id without a doctors row — create/link one when missing.
 */
export async function ensureDoctorRecordForUser(contextUserId) {
  const found = await resolveDoctorContextIds(contextUserId)
  if (found.doctorRowId) {
    const { data: check, error } = await supabase
      .from('doctors')
      .select('id')
      .eq('id', found.doctorRowId)
      .maybeSingle()
    if (!error && check) return found
    if (error && !isMissingColumn(error)) throw error
  }

  const userId = found.userId || contextUserId
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('id', userId)
    .maybeSingle()

  if (userErr) throw userErr
  if (!user) throw new Error('Doctor account not found in users table')

  const email = (user.email || '').toLowerCase().trim()
  if (email) {
    const { data: byEmail } = await supabase
      .from('doctors')
      .select('id, user_id')
      .eq('email', email)
      .maybeSingle()
    if (byEmail?.id) {
      if (!byEmail.user_id || byEmail.user_id !== userId) {
        await supabase.from('doctors').update({ user_id: userId }).eq('id', byEmail.id)
      }
      return { doctorRowId: byEmail.id, userId }
    }
  }

  const displayName = (user.name || email.split('@')[0] || 'Doctor').trim()
  const insertAttempts = [
    {
      user_id: userId,
      full_name: displayName,
      specialization: 'General physician',
      bio: '',
      consultation_fee: 0,
      is_verified: true,
      is_active: true,
    },
    {
      user_id: userId,
      full_name: displayName,
      specialization: 'General physician',
      is_verified: true,
    },
    { user_id: userId, full_name: displayName },
    { user_id: userId },
  ]

  for (const payload of insertAttempts) {
    const { data: created, error } = await supabase
      .from('doctors')
      .insert(payload)
      .select('id')
      .single()
    if (!error && created?.id) return { doctorRowId: created.id, userId }
    if (!isMissingColumn(error) && !isForeignKeyError(error)) throw error
  }

  throw new Error(
    'Doctor profile row missing. Ask admin to re-add this doctor or run supabase/011_doctors_link_users.sql.'
  )
}

export async function resolveDoctorContextIdsOrCreate(contextUserId) {
  const found = await resolveDoctorContextIds(contextUserId)
  if (found.doctorRowId) {
    const { data: check } = await supabase
      .from('doctors')
      .select('id')
      .eq('id', found.doctorRowId)
      .maybeSingle()
    if (check) return found
  }
  return ensureDoctorRecordForUser(contextUserId)
}

export async function fetchAppointmentsForDoctor(contextUserId) {
  const { doctorRowId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  if (!doctorRowId) return []

  const columnAttempts = ['doctor_id', 'doc_id']

  for (const column of columnAttempts) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq(column, doctorRowId)
      .order('created_at', { ascending: false })

    if (!error) return data || []
    if (!isMissingColumn(error)) throw error
  }

  return []
}

export function appointmentBelongsToDoctor(appointment, doctorRowId, contextUserId) {
  const ref = appointmentDoctorRef(appointment)
  if (!ref) return false
  return ref === doctorRowId || ref === contextUserId
}

async function loadPatientLabels(patientIds) {
  const labels = {}
  if (!patientIds.length) return labels

  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, user_id, full_name')
    .in('id', patientIds)

  if (error && !isMissingColumn(error)) throw error
  for (const p of patients || []) {
    labels[p.id] = { name: p.full_name || 'Patient', user_id: p.user_id }
  }

  const missingUserIds = [
    ...new Set(
      (patients || [])
        .filter((p) => !p.full_name && p.user_id)
        .map((p) => p.user_id)
    ),
  ]

  if (missingUserIds.length) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, image')
      .in('id', missingUserIds)

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]))
    for (const p of patients || []) {
      const u = userMap[p.user_id]
      if (u) {
        labels[p.id] = {
          name: u.name || u.email || 'Patient',
          image: u.image,
          user_id: p.user_id,
        }
      }
    }
  }

  return labels
}

/** CareLink UI expects user_data, slot_date, payment, cancelled, isCompleted. */
export async function mapAppointmentsForDoctorUi(rows) {
  const patientIds = [...new Set(rows.map((r) => r.patient_id).filter(Boolean))]
  const patientLabels = await loadPatientLabels(patientIds)

  return rows.map((row) => {
    if (row.user_data?.name) {
      return {
        ...row,
        isCompleted: row.is_completed ?? row.isCompleted ?? false,
      }
    }

    const scheduled = row.scheduled_at ? new Date(row.scheduled_at) : null
    const slot_date = scheduled
      ? `${scheduled.getDate()}_${scheduled.getMonth() + 1}_${scheduled.getFullYear()}`
      : row.slot_date || ''
    const slot_time = scheduled
      ? scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : row.slot_time || '—'

    const patient = row.patient_id ? patientLabels[row.patient_id] : null
    const name = patient?.name || 'Patient'

    return {
      ...row,
      slot_date,
      slot_time,
      user_data: {
        name,
        image:
          patient?.image ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff`,
        dob: 'Not Selected',
      },
      amount: row.amount ?? 0,
      payment:
        row.payment === true ||
        row.status === 'confirmed' ||
        row.status === 'completed' ||
        row.status === 'awaiting_verification',
      cancelled: row.cancelled === true || row.status === 'cancelled',
      isCompleted: row.is_completed === true || row.status === 'completed',
    }
  })
}

export async function updateAppointmentCancelled(appointmentId) {
  const attempts = [{ cancelled: true }, { status: 'cancelled' }]
  let lastError = null
  for (const patch of attempts) {
    const { error } = await supabase.from('appointments').update(patch).eq('id', appointmentId)
    if (!error) return
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  throw lastError || new Error('Could not cancel appointment')
}

export async function updateAppointmentCompleted(appointmentId) {
  const attempts = [{ is_completed: true }, { status: 'completed' }]
  let lastError = null
  for (const patch of attempts) {
    const { error } = await supabase.from('appointments').update(patch).eq('id', appointmentId)
    if (!error) return
    lastError = error
    if (!isMissingColumn(error)) throw error
  }
  throw lastError || new Error('Could not complete appointment')
}

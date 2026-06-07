import supabase from '../config/supabase.js'
import { appointmentDoctorRef } from './appointmentDoctorRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

/** doctors.id from either doctor row id or doctor user_id */
export async function resolveDoctorRowId(doctorRef) {
  if (!doctorRef) return null

  const { data: byId, error: e1 } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', doctorRef)
    .maybeSingle()

  if (e1 && !isMissingColumn(e1)) throw e1
  if (byId?.id) return byId.id

  const { data: byUser, error: e2 } = await supabase
    .from('doctors')
    .select('id')
    .eq('user_id', doctorRef)
    .maybeSingle()

  if (e2 && !isMissingColumn(e2)) throw e2
  return byUser?.id || null
}

/** Login may use public.users.id while assistants.user_id still holds profiles.id */
async function candidateAssistantUserIds(assistantUserId) {
  const ids = new Set()
  if (assistantUserId) ids.add(assistantUserId)

  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', assistantUserId)
    .maybeSingle()

  const email = (user?.email || '').toLowerCase().trim()
  if (email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (profile?.id) ids.add(profile.id)
  }

  return [...ids]
}

async function findAssistantLinkRow(assistantUserId) {
  const candidateIds = await candidateAssistantUserIds(assistantUserId)

  for (const uid of candidateIds) {
    const { data: link, error } = await supabase
      .from('assistants')
      .select('id, user_id, doctor_id')
      .eq('user_id', uid)
      .maybeSingle()

    if (error && !isMissingColumn(error)) throw error
    if (link) {
      return { link, matchedUserId: uid }
    }
  }

  return null
}

/** Point assistants.user_id at the id used in JWT (public.users) when possible */
async function syncAssistantUserId(linkRow, canonicalUserId) {
  if (!linkRow?.id || !canonicalUserId || linkRow.user_id === canonicalUserId) return

  const { error } = await supabase
    .from('assistants')
    .update({ user_id: canonicalUserId })
    .eq('id', linkRow.id)

  if (!error) return

  if (/foreign key|violates foreign key/i.test(error.message || '')) {
    return
  }

  if (!isMissingColumn(error)) {
    console.warn('syncAssistantUserId:', error.message)
  }
}

async function fetchDoctorForAssignment(doctorRowId) {
  const attempts = [
    'id, user_id, full_name, name, email, specialization, speciality',
    'id, user_id, full_name, specialization, speciality',
    'id, user_id, name, email, speciality',
    'id, user_id, name, email',
    '*',
  ]

  for (const cols of attempts) {
    const { data, error } = await supabase
      .from('doctors')
      .select(cols)
      .eq('id', doctorRowId)
      .maybeSingle()

    if (!error && data) return data
    if (error && !isMissingColumn(error)) throw error
  }

  return null
}

export async function resolveAssistantAssignment(assistantUserId) {
  if (!assistantUserId) return null

  const found = await findAssistantLinkRow(assistantUserId)
  if (!found?.link?.doctor_id) return null

  const { link, matchedUserId } = found

  if (matchedUserId !== assistantUserId) {
    await syncAssistantUserId(link, assistantUserId)
  }

  const doctorRowId = await resolveDoctorRowId(link.doctor_id)
  if (!doctorRowId) return null

  const doctor = await fetchDoctorForAssignment(doctorRowId)
  if (!doctor) return null

  const doctorUserId = doctor.user_id || doctor.id

  return {
    assistantUserId,
    assistantRowId: link.id,
    doctorRowId: doctor.id,
    doctorUserId,
    doctorName: doctor.full_name || doctor.name || 'Doctor',
    doctorEmail: doctor.email || null,
    doctorSpecialization: doctor.specialization || doctor.speciality || null,
  }
}

export function filterAppointmentsForDoctorRow(rows, doctorRowId) {
  if (!doctorRowId) return rows
  return (rows || []).filter((row) => appointmentDoctorRef(row) === doctorRowId)
}

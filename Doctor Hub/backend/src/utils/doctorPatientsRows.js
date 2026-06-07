import supabase from '../config/supabase.js'
import {
  fetchAppointmentsForDoctor,
  mapAppointmentsForDoctorUi,
  resolveDoctorContextIdsOrCreate,
} from './appointmentDoctorRows.js'

export async function fetchDoctorPatientsList(contextUserId) {
  const rows = await fetchAppointmentsForDoctor(contextUserId)
  const appointments = await mapAppointmentsForDoctorUi(rows)

  const byPatient = new Map()

  for (const appt of appointments) {
    const key = appt.user_id || appt.patient_id || appt.user_data?.id
    if (!key) continue

    const existing = byPatient.get(key) || {
      patient_id: appt.patient_id,
      user_id: appt.user_id,
      name: appt.user_data?.name || 'Patient',
      email: appt.user_data?.email || null,
      phone: appt.user_data?.phone || null,
      image: appt.user_data?.image || null,
      visit_count: 0,
      last_visit: null,
      last_status: null,
    }

    existing.visit_count += 1
    const visitDate = appt.slot_date || appt.appointment_date || appt.created_at
    if (!existing.last_visit || String(visitDate) > String(existing.last_visit)) {
      existing.last_visit = visitDate
      existing.last_status = appt.status || (appt.is_completed ? 'completed' : 'pending')
    }

    byPatient.set(key, existing)
  }

  return [...byPatient.values()].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0))
}

export async function countDoctorPatients(contextUserId) {
  const list = await fetchDoctorPatientsList(contextUserId)
  return list.length
}

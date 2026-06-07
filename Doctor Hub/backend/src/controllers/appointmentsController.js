import supabase from '../config/supabase.js'
import { countByStatus, mapAppointmentSummary, classifyAppointment } from '../utils/appointmentStatus.js'
import {
  fetchAppointmentsForDoctor,
  mapAppointmentsForDoctorUi,
  resolveDoctorContextIdsOrCreate,
} from '../utils/appointmentDoctorRows.js'
import { fetchPatientAppointments } from '../utils/patientAppointmentRows.js'

export async function getMyAppointments(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const rows = await fetchPatientAppointments(userId)
    const stats = countByStatus(rows)
    const appointments = rows.map(mapAppointmentSummary)
    const recent = appointments.filter((a) => a.status !== 'cancelled').slice(0, 3)

    return res.json({ appointments, stats, recent })
  } catch (err) {
    console.error('getMyAppointments:', err)
    return res.status(500).json({ message: err.message || 'Failed to load appointments' })
  }
}

function isToday(row) {
  const now = new Date()
  if (row.slot_date) {
    const parts = String(row.slot_date).split('_')
    if (parts.length === 3) {
      const d = new Date(+parts[2], +parts[1] - 1, +parts[0])
      return d.toDateString() === now.toDateString()
    }
  }
  if (row.appointment_date) {
    return new Date(row.appointment_date).toDateString() === now.toDateString()
  }
  if (row.scheduled_at) {
    return new Date(row.scheduled_at).toDateString() === now.toDateString()
  }
  return false
}

export async function getDoctorDashboard(req, res) {
  try {
    const doctorId = req.user?.id
    if (!doctorId) return res.status(401).json({ message: 'Authentication required' })

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(doctorId)
    const rawAppointments = await fetchAppointmentsForDoctor(doctorId)
    const appointments = await mapAppointmentsForDoctorUi(rawAppointments)

    const today = appointments.filter(
      (a) => isToday(a) && classifyAppointment(a) !== 'cancelled'
    )
    const completed = appointments.filter((a) => classifyAppointment(a) === 'completed')
    const patientIds = new Set(completed.map((a) => a.user_id || a.patient_id).filter(Boolean))

    const confirmedWithoutRecord = []
    for (const a of appointments) {
      if (classifyAppointment(a) !== 'confirmed') continue
      let hasRecord = false
      const { data: hist, error: histErr } = await supabase
        .from('medical_history')
        .select('id')
        .eq('appointment_id', a.id)
        .maybeSingle()
      if (!histErr && hist) hasRecord = true
      if (!hasRecord) {
        confirmedWithoutRecord.push({
          id: a.id,
          patient_name: a.user_data?.name || 'Patient',
          slot_time: a.slot_time || '—',
          disease_description: a.disease_description || a.disease_query || a.symptoms || '',
        })
      }
    }

    let doctorName = appointments[0]?.doc_data?.name || 'Doctor'
    if (!appointments[0]?.doc_data?.name) {
      const attempts = ['full_name', 'name', '*']
      for (const sel of attempts) {
        const { data: doc, error } = await supabase
          .from('doctors')
          .select(sel)
          .eq('id', doctorRowId)
          .maybeSingle()
        if (!error && doc) {
          doctorName = doc.full_name || doc.name || doctorName
          break
        }
        if (error && !/column|does not exist/i.test(error.message || '')) break
      }
    }

    return res.json({
      doctorName,
      stats: {
        todayCount: today.length,
        patientsSeen: patientIds.size,
        pendingRecords: confirmedWithoutRecord.length,
      },
      todayAppointments: today.slice(0, 10).map((a) => ({
        id: a.id,
        patient_name: a.user_data?.name || 'Patient',
        slot_time: a.slot_time || '—',
        disease_description: a.disease_description || a.disease_query || a.symptoms || '',
        status: classifyAppointment(a),
      })),
      pendingRecords: confirmedWithoutRecord,
    })
  } catch (err) {
    console.error('getDoctorDashboard:', err)
    return res.status(500).json({ message: err.message || 'Failed to load dashboard' })
  }
}

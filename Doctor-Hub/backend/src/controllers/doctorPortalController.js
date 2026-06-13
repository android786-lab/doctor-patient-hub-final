import {
  fetchDoctorProfileForUi,
  saveDoctorProfileModule,
} from '../utils/doctorProfileRows.js'
import {
  fetchClinicsForDoctor,
  createClinicForDoctor,
} from '../utils/clinicRows.js'
import {
  fetchDoctorSchedule,
  saveDoctorSchedule,
} from '../utils/doctorScheduleRows.js'
import {
  fetchDateSchedules,
  saveDateSchedules,
} from '../utils/doctorScheduleDateRows.js'
import {
  fetchAppointmentsForDoctor,
  mapAppointmentsForDoctorUi,
  resolveDoctorContextIdsOrCreate,
} from '../utils/appointmentDoctorRows.js'
import { fetchDoctorPatientsList } from '../utils/doctorPatientsRows.js'
import { classifyAppointment } from '../utils/appointmentStatus.js'
import { getDoctorDashboard } from './appointmentsController.js'
import supabase from '../config/supabase.js'
import { fetchPendingVerificationAppointments } from '../utils/appointmentRows.js'
import { filterAppointmentsForDoctorRow } from '../utils/assistantRows.js'
import { appointmentDoctorRef } from '../utils/appointmentDoctorRows.js'
import { upsertAssistantAssignment } from '../utils/authUserRows.js'

function mapClinicForApi(c) {
  const timings = c.timings || {}
  const days = c.available_days || []
  return {
    id: c.id,
    clinicName: c.clinic_name || c.name,
    name: c.name || c.clinic_name,
    address: c.address,
    city: c.city,
    phone: c.phone,
    availableDays: Array.isArray(days) ? days : [],
    startTime: c.start_time ? String(c.start_time).slice(0, 5) : null,
    endTime: c.end_time ? String(c.end_time).slice(0, 5) : null,
    timings,
  }
}

function parseClinicBody(body) {
  const clinicName = (body.clinicName || body.name || '').trim()
  const availableDays = body.availableDays || body.available_days || []
  const startTime = body.startTime || body.start_time
  const endTime = body.endTime || body.end_time

  const timings = body.timings || {}
  if (Array.isArray(availableDays) && availableDays.length && startTime && endTime) {
    for (const day of availableDays) {
      const key = String(day).toLowerCase().slice(0, 3)
      timings[key] = `${startTime} - ${endTime}`
    }
  }

  return {
    name: clinicName,
    address: body.address,
    city: body.city,
    phone: body.phone,
    timings,
    clinic_name: clinicName,
    available_days: availableDays,
    start_time: startTime,
    end_time: endTime,
  }
}

export async function getDoctorPortalProfile(req, res) {
  try {
    const profile = await fetchDoctorProfileForUi(req.user.id)
    return res.json({
      success: true,
      profile,
      profileData: profile,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function setupDoctorProfile(req, res) {
  try {
    const profile = await saveDoctorProfileModule(req.user.id, req.body)
    return res.status(201).json({
      success: true,
      message: 'Profile saved',
      profile,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateDoctorProfilePut(req, res) {
  try {
    const profile = await saveDoctorProfileModule(req.user.id, req.body)
    return res.json({
      success: true,
      message: 'Profile updated',
      profile,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function addDoctorClinic(req, res) {
  try {
    const parsed = parseClinicBody(req.body)
    if (!parsed.name) {
      return res.status(400).json({ success: false, message: 'clinicName is required' })
    }

    const clinic = await createClinicForDoctor(req.user.id, parsed)
    return res.status(201).json({
      success: true,
      message: 'Clinic added',
      clinic: mapClinicForApi(clinic),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function listDoctorClinics(req, res) {
  try {
    const clinics = await fetchClinicsForDoctor(req.user.id)
    return res.json({
      success: true,
      clinics: clinics.map(mapClinicForApi),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function getDoctorSchedulePortal(req, res) {
  try {
    const weekly = await fetchDoctorSchedule(req.user.id)
    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)
    const date_schedules = await fetchDateSchedules(doctorRowId)

    return res.json({
      success: true,
      ...weekly,
      date_schedules,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function setDoctorSchedulePortal(req, res) {
  try {
    const { weekly_schedule, slot_duration_minutes, date_schedules } = req.body

    let weekly = null
    if (weekly_schedule) {
      weekly = await saveDoctorSchedule(req.user.id, {
        weekly_schedule,
        slot_duration_minutes,
      })
    }

    let dates = []
    if (Array.isArray(date_schedules) && date_schedules.length) {
      const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)
      dates = await saveDateSchedules(doctorRowId, date_schedules)
    } else if (!weekly) {
      return res.status(400).json({
        success: false,
        message: 'Provide weekly_schedule and/or date_schedules',
      })
    }

    return res.json({
      success: true,
      message: 'Schedule saved',
      weekly_schedule: weekly?.weekly_schedule,
      slot_duration_minutes: weekly?.slot_duration_minutes,
      date_schedules: dates,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function listDoctorAppointmentsPortal(req, res) {
  try {
    const rows = await fetchAppointmentsForDoctor(req.user.id)
    const appointments = await mapAppointmentsForDoctorUi(rows)

    const mapped = appointments.map((a) => ({
      ...a,
      patient_name: a.user_data?.name || 'Patient',
      patient_image: a.user_data?.image,
      date: a.slot_date || a.appointment_date,
      time: a.slot_time || a.appointment_time,
      status: classifyAppointment(a),
      is_completed: a.is_completed || a.isCompleted,
    }))

    return res.json({ success: true, appointments: mapped })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function listDoctorPatientsPortal(req, res) {
  try {
    const patients = await fetchDoctorPatientsList(req.user.id)
    return res.json({ success: true, patients })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function getDoctorPortalDashboard(req, res) {
  try {
    const mockRes = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.body = payload
        return this
      },
    }
    await getDoctorDashboard(req, mockRes)

    const base = mockRes.body || {}
    const rows = await fetchAppointmentsForDoctor(req.user.id)
    const appointments = await mapAppointmentsForDoctorUi(rows)

    const pendingPayments = appointments.filter((a) => {
      const st = classifyAppointment(a)
      return (
        st === 'awaiting_verification' ||
        st === 'payment_uploaded' ||
        st === 'pending_payment' ||
        (a.payment_proof_url && st !== 'confirmed' && st !== 'completed')
      )
    }).length

    const patients = await fetchDoctorPatientsList(req.user.id)

    return res.json({
      success: true,
      doctorName: base.doctorName,
      stats: {
        totalAppointments: appointments.length,
        todayAppointments: base.stats?.todayCount ?? 0,
        totalPatients: patients.length,
        pendingPayments,
        patientsSeen: base.stats?.patientsSeen ?? patients.length,
        pendingRecords: base.stats?.pendingRecords ?? 0,
      },
      todayAppointments: base.todayAppointments || [],
      pendingRecords: base.pendingRecords || [],
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function getDoctorAssistant(req, res) {
  try {
    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)

    const { data: link } = await supabase
      .from('assistants')
      .select('id, user_id, doctor_id, created_at')
      .eq('doctor_id', doctorRowId)
      .maybeSingle()

    if (!link?.user_id) {
      return res.json({ success: true, assistant: null })
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone, role, is_active')
      .eq('id', link.user_id)
      .maybeSingle()

    const pendingAll = await fetchPendingVerificationAppointments()
    const pendingForDoctor = filterAppointmentsForDoctorRow(pendingAll, doctorRowId)

    const appts = await fetchAppointmentsForDoctor(req.user.id)
    const today = new Date().toDateString()
    const todayCount = (appts || []).filter((a) => {
      const ref = appointmentDoctorRef(a)
      if (ref !== doctorRowId) return false
      if (a.slot_date) {
        const parts = String(a.slot_date).split('_')
        if (parts.length === 3) {
          const d = new Date(+parts[2], +parts[1] - 1, +parts[0])
          return d.toDateString() === today
        }
      }
      return false
    }).length

    return res.json({
      success: true,
      assistant: {
        id: link.id,
        userId: link.user_id,
        name: user?.name || user?.email || 'Assistant',
        email: user?.email || null,
        phone: user?.phone || null,
        isActive: user?.is_active !== false,
        assignedAt: link.created_at || null,
        activity: {
          pendingPayments: pendingForDoctor.length,
          todayAppointments: todayCount,
        },
      },
    })
  } catch (err) {
    console.error('getDoctorAssistant:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function listDoctorAssistantCandidates(req, res) {
  try {
    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, is_active')
      .eq('role', 'assistant')
      .limit(100)

    if (error) throw error

    const { data: assigned } = await supabase
      .from('assistants')
      .select('user_id, doctor_id')

    const assignedMap = Object.fromEntries((assigned || []).map((a) => [a.user_id, a.doctor_id]))

    const candidates = (users || []).map((u) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      phone: u.phone,
      isActive: u.is_active !== false,
      assignedToYou: assignedMap[u.id] === doctorRowId,
      assignedElsewhere: assignedMap[u.id] && assignedMap[u.id] !== doctorRowId,
    }))

    return res.json({ success: true, candidates })
  } catch (err) {
    console.error('listDoctorAssistantCandidates:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function assignDoctorAssistant(req, res) {
  try {
    const { assistantUserId, email } = req.body
    if (!assistantUserId && !email) {
      return res.status(400).json({ success: false, message: 'assistantUserId or email is required' })
    }

    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)

    let userId = assistantUserId
    if (!userId && email) {
      const { data: user } = await supabase
        .from('users')
        .select('id, role')
        .ilike('email', email.trim())
        .maybeSingle()
      if (!user?.id) {
        return res.status(404).json({ success: false, message: 'Assistant account not found' })
      }
      if ((user.role || '').toLowerCase() !== 'assistant') {
        return res.status(400).json({ success: false, message: 'That user is not an assistant' })
      }
      userId = user.id
    }

    await upsertAssistantAssignment(userId, doctorRowId)

    return res.json({ success: true, message: 'Assistant assigned to your practice' })
  } catch (err) {
    console.error('assignDoctorAssistant:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function removeDoctorAssistant(req, res) {
  try {
    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)

    const { data: link, error } = await supabase
      .from('assistants')
      .select('id')
      .eq('doctor_id', doctorRowId)
      .maybeSingle()

    if (error) throw error
    if (!link?.id) {
      return res.json({ success: true, message: 'No assistant was assigned' })
    }

    const { error: delErr } = await supabase.from('assistants').delete().eq('id', link.id)
    if (delErr) throw delErr

    return res.json({ success: true, message: 'Assistant removed from your practice' })
  } catch (err) {
    console.error('removeDoctorAssistant:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

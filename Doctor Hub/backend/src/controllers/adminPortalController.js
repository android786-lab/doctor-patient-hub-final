import bcrypt from 'bcrypt'
import supabase from '../config/supabase.js'
import { fetchPendingVerificationAppointments } from '../utils/appointmentRows.js'
import {
  fetchDoctorsForAdmin,
  fetchPatientsForAdmin,
  fetchAllUsersForAdmin,
  fetchAssistantsForAdmin,
  updateDoctorVerified,
  fetchAllAppointmentsForAdmin,
  fetchAllPaymentsForAdmin,
} from '../utils/adminPortalRows.js'
import { getAdminAnalytics } from '../utils/adminAnalytics.js'
import {
  mapAppointmentForAdmin,
} from '../utils/appointmentRows.js'
import { mapAppointmentsForPatientUi } from '../utils/patientAppointmentRows.js'
import { mapAppointmentsForDoctorUi } from '../utils/appointmentDoctorRows.js'
import {
  findUserByEmail,
  createAssistantAccount,
  upsertAssistantAssignment,
} from '../utils/authUserRows.js'
import { resolveAssistantAssignment } from '../utils/assistantRows.js'

const SALT_ROUNDS = 10

export async function listDoctorsAdmin(req, res) {
  try {
    const doctors = await fetchDoctorsForAdmin()
    return res.json({ success: true, doctors })
  } catch (err) {
    console.error('listDoctorsAdmin:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load doctors' })
  }
}

export async function listPatientsAdmin(req, res) {
  try {
    const patients = await fetchPatientsForAdmin()
    return res.json({ success: true, patients })
  } catch (err) {
    console.error('listPatientsAdmin:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load patients' })
  }
}

export async function verifyDoctor(req, res) {
  try {
    const { id } = req.params
    await updateDoctorVerified(id, true)
    return res.json({ success: true, message: 'Doctor verified' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to verify doctor' })
  }
}

export async function unverifyDoctor(req, res) {
  try {
    const { id } = req.params
    await updateDoctorVerified(id, false)
    return res.json({ success: true, message: 'Doctor unverified' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to unverify doctor' })
  }
}

export async function listAppointmentsAdmin(req, res) {
  try {
    const { status, date } = req.query
    let rows = await fetchAllAppointmentsForAdmin({ status, date })
    if (rows.length && !rows.some((r) => r.user_data?.name && r.doc_data?.name)) {
      const withPatient = await mapAppointmentsForPatientUi(rows)
      rows = await mapAppointmentsForDoctorUi(withPatient)
    }
    const appointments = rows.map(mapAppointmentForAdmin)
    return res.json({ success: true, appointments, count: appointments.length })
  } catch (err) {
    console.error('listAppointmentsAdmin:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load appointments' })
  }
}

export async function listPaymentsAdmin(req, res) {
  try {
    const payments = await fetchAllPaymentsForAdmin()
    return res.json({ success: true, payments, count: payments.length })
  } catch (err) {
    console.error('listPaymentsAdmin:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load payments' })
  }
}

export async function getAdminAnalyticsHandler(req, res) {
  try {
    const analytics = await getAdminAnalytics()
    return res.json({ success: true, analytics })
  } catch (err) {
    console.error('getAdminAnalytics:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load analytics' })
  }
}

export async function deactivateUser(req, res) {
  try {
    const { id } = req.params

    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id)

    if (!error) return res.json({ message: 'User deactivated' })

    const docErr = await supabase
      .from('doctors')
      .update({ is_active: false })
      .eq('id', id)

    if (docErr.error) throw error || docErr.error
    return res.json({ message: 'Doctor deactivated' })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to deactivate' })
  }
}

export async function createAssistant(req, res) {
  try {
    const { full_name, email, password, phone, doctorId } = req.body
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await findUserByEmail(normalizedEmail)
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await createAssistantAccount({
      email: normalizedEmail,
      password,
      passwordHash: hashedPassword,
      full_name,
      phone,
      doctorId,
    })

    const assignment = doctorId ? { doctorId } : null

    return res.status(201).json({
      message: doctorId
        ? 'Assistant account created and assigned to doctor'
        : 'Assistant account created — assign to a doctor from the dashboard',
      user: {
        id: user.id,
        email: user.email,
        name: full_name,
        role: 'assistant',
      },
      assignment,
    })
  } catch (err) {
    console.error('createAssistant:', err)
    return res.status(500).json({ message: err.message || 'Failed to create assistant' })
  }
}

export async function assignAssistant(req, res) {
  try {
    const { doctorId, assistantUserId } = req.body
    if (!doctorId || !assistantUserId) {
      return res.status(400).json({ message: 'doctorId and assistantUserId are required' })
    }

    await upsertAssistantAssignment(assistantUserId, doctorId)

    return res.json({ message: 'Assistant assigned' })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to assign assistant' })
  }
}

export async function changeUserRole(req, res) {
  try {
    const { id } = req.params
    const { newRole } = req.body
    const callerRole = req.user?.role

    if (!newRole) return res.status(400).json({ message: 'newRole is required' })

    if (req.user?.id === id && req.user?.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot change your own super_admin role' })
    }

    const allowed = ['patient', 'doctor', 'assistant', 'admin', 'super_admin']
    if (!allowed.includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    if (callerRole === 'admin') {
      if (!['patient', 'assistant'].includes(newRole)) {
        return res.status(403).json({
          message: 'Admins can only set patient or assistant roles',
        })
      }
      const { data: target, error: targetErr } = await supabase
        .from('users')
        .select('id, role, email')
        .eq('id', id)
        .maybeSingle()
      if (targetErr) throw targetErr
      if (!target) return res.status(404).json({ message: 'User not found' })
      const current = (target.role || 'patient').toLowerCase()
      if (!['patient', 'assistant'].includes(current)) {
        return res.status(403).json({
          message: 'Only patients or assistants can be updated by admin',
        })
      }
      if (newRole === 'assistant') {
        const { data: byUser } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', id)
          .maybeSingle()
        if (byUser?.id) {
          return res.status(403).json({ message: 'Doctor accounts cannot become assistants' })
        }
        if (target.email) {
          const { data: byEmail } = await supabase
            .from('doctors')
            .select('id')
            .ilike('email', target.email.trim())
            .maybeSingle()
          if (byEmail?.id) {
            return res.status(403).json({ message: 'Doctor accounts cannot become assistants' })
          }
        }
      }
    }

    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', id)
    if (error) throw error

    return res.json({ message: 'Role updated' })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update role' })
  }
}

export async function listAllUsers(req, res) {
  try {
    let users = await fetchAllUsersForAdmin()
    if (req.user?.role === 'admin') {
      users = users.filter((u) => {
        const r = (u.role || 'patient').toLowerCase()
        if (u.is_doctor || r === 'doctor') return false
        return r === 'patient' || r === 'assistant'
      })
    }
    return res.json({ users })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to load users' })
  }
}

export async function getAssistantDashboard(req, res) {
  try {
    const pending = await fetchPendingVerificationAppointments()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let verifiedToday = 0
    let rejectedToday = 0

    const { data: payments } = await supabase
      .from('payments')
      .select('status, verified_at')
      .gte('verified_at', today.toISOString())

    for (const p of payments || []) {
      if (p.status === 'succeeded' || p.status === 'verified') verifiedToday += 1
      if (p.status === 'rejected') rejectedToday += 1
    }

    return res.json({
      pendingCount: pending.length,
      pending: pending.slice(0, 20).map((a) => ({
        id: a.id,
        patient_name: a.user_data?.name || 'Patient',
        doctor_name: a.doc_data?.name || 'Doctor',
        slot_date: a.slot_date,
        slot_time: a.slot_time,
        amount: a.amount,
      })),
      stats: {
        verifiedToday,
        rejectedToday,
        totalProcessed: verifiedToday + rejectedToday,
      },
    })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to load assistant dashboard' })
  }
}

export async function listAssistantsAndDoctors(req, res) {
  try {
    const doctors = await fetchDoctorsForAdmin()
    const assistants = await fetchAssistantsForAdmin()

    const enriched = await Promise.all(
      assistants.map(async (a) => {
        const assignment = await resolveAssistantAssignment(a.id)
        return {
          ...a,
          doctor_id: assignment?.doctorRowId || null,
          assigned_doctor: assignment?.doctorName || null,
        }
      })
    )

    return res.json({
      doctors: doctors.map((d) => ({ id: d.id, name: d.name })),
      assistants: enriched,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to load lists' })
  }
}

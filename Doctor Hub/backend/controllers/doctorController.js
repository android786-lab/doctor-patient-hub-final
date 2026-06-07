import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import supabase from '../config/supabaseClient.js'
import { listDoctorsLegacy } from '../src/controllers/doctorsController.js'
import { findUserByEmail } from '../src/utils/authUserRows.js'
import {
    fetchAppointmentsForDoctor,
    mapAppointmentsForDoctorUi,
    resolveDoctorContextIdsOrCreate,
    appointmentBelongsToDoctor,
    updateAppointmentCancelled,
    updateAppointmentCompleted,
} from '../src/utils/appointmentDoctorRows.js'
import {
    fetchDoctorProfileForUi,
    updateDoctorProfileForUi,
} from '../src/utils/doctorProfileRows.js'

// Doctor login — CareLink doctors.email, then public.users (role doctor)
const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body
        const normalized = (email || '').toLowerCase().trim()

        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, email, password')
            .eq('email', normalized)
            .maybeSingle()

        if (doctor?.password) {
            const isMatch = await bcrypt.compare(password, doctor.password)
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' })
            }
            const token = jwt.sign({ id: doctor.id, role: 'doctor' }, process.env.JWT_SECRET)
            return res.json({ success: true, token })
        }

        const user = await findUserByEmail(normalized)
        if (!user || (user.role && user.role !== 'doctor')) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'doctor' },
            process.env.JWT_SECRET
        )
        return res.json({ success: true, token })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get doctor's appointments (doctor_id or doc_id; JWT may be users.id or doctors.id)
const appointmentsDoctor = async (req, res) => {
    try {
        const rows = await fetchAppointmentsForDoctor(req.user.id)
        const appointments = await mapAppointmentsForDoctorUi(rows)
        res.json({ success: true, appointments })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Cancel appointment (doctor)
const appointmentCancel = async (req, res) => {
    try {
        const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)
        const { appointmentId } = req.body

        const { data: appointment, error: fetchErr } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (
            fetchErr ||
            !appointment ||
            !appointmentBelongsToDoctor(appointment, doctorRowId, req.user.id)
        ) {
            return res.status(403).json({ success: false, message: 'Invalid doctor or appointment' })
        }

        await updateAppointmentCancelled(appointmentId)
        res.json({ success: true, message: 'Appointment Cancelled' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Complete appointment
const appointmentComplete = async (req, res) => {
    try {
        const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user.id)
        const { appointmentId } = req.body

        const { data: appointment, error: fetchErr } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (
            fetchErr ||
            !appointment ||
            !appointmentBelongsToDoctor(appointment, doctorRowId, req.user.id)
        ) {
            return res.status(403).json({ success: false, message: 'Invalid doctor or appointment' })
        }

        await updateAppointmentCompleted(appointmentId)
        res.json({ success: true, message: 'Appointment Completed' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

const doctorList = listDoctorsLegacy

// Toggle availability
const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body
        if (!docId) return res.status(400).json({ success: false, message: 'Doctor ID missing' })

        const { data: doctor, error: fetchErr } = await supabase
            .from('doctors').select('is_active').eq('id', docId).single()
        if (fetchErr || !doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })

        const nextActive = doctor.is_active === false
        const patch = { is_active: nextActive, available: nextActive }
        let { error } = await supabase.from('doctors').update(patch).eq('id', docId)
        if (error && /column|does not exist|schema cache/i.test(error.message || '')) {
          ;({ error } = await supabase
            .from('doctors')
            .update({ is_active: nextActive })
            .eq('id', docId))
        }
        if (error) throw error
        res.json({ success: true, message: 'Availability changed successfully' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get doctor profile (001: full_name/bio/consultation_fee — CareLink: name/about/fees)
const doctorProfile = async (req, res) => {
    try {
        const profileData = await fetchDoctorProfileForUi(req.user.id)
        res.json({ success: true, profileData })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Update doctor profile
const updateDoctorProfile = async (req, res) => {
    try {
        const { fees, address, available, about } = req.body
        await updateDoctorProfileForUi(req.user.id, { fees, address, available, about })
        res.json({ success: true, message: 'Profile Updated' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Doctor dashboard
const doctorDashboard = async (req, res) => {
    try {
        const rows = await fetchAppointmentsForDoctor(req.user.id)
        const appointments = await mapAppointmentsForDoctorUi(rows)

        let earnings = 0
        const patientSet = new Set()
        appointments.forEach(a => {
            if (a.is_completed || a.isCompleted || a.payment) earnings += Number(a.amount) || 0
            patientSet.add(a.user_id || a.patient_id)
        })

        res.json({
            success: true,
            dashData: {
                earnings,
                appointments: appointments.length,
                patients: patientSet.size,
                latestAppointments: [...appointments].reverse().slice(0, 5)
            }
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export {
    loginDoctor, appointmentsDoctor, appointmentCancel, appointmentComplete,
    doctorList, changeAvailability, doctorProfile, updateDoctorProfile, doctorDashboard
}

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import supabase from '../config/supabaseClient.js'

// Doctor login
const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body
        const { data: doctor, error } = await supabase
            .from('doctors').select('*').eq('email', email).single()

        if (error || !doctor) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        const isMatch = await bcrypt.compare(password, doctor.password)
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        const token = jwt.sign({ id: doctor.id }, process.env.JWT_SECRET)
        res.json({ success: true, token })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get doctor's appointments
const appointmentsDoctor = async (req, res) => {
    try {
        const docId = req.user.id
        const { data: appointments, error } = await supabase
            .from('appointments').select('*').eq('doc_id', docId)
        if (error) throw error
        res.json({ success: true, appointments })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Cancel appointment (doctor)
const appointmentCancel = async (req, res) => {
    try {
        const docId = req.user.id
        const { appointmentId } = req.body

        const { data: appointment, error: fetchErr } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (fetchErr || !appointment || appointment.doc_id !== docId) {
            return res.status(403).json({ success: false, message: 'Invalid doctor or appointment' })
        }

        await supabase.from('appointments').update({ cancelled: true }).eq('id', appointmentId)
        res.json({ success: true, message: 'Appointment Cancelled' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Complete appointment
const appointmentComplete = async (req, res) => {
    try {
        const docId = req.user.id
        const { appointmentId } = req.body

        const { data: appointment, error: fetchErr } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (fetchErr || !appointment || appointment.doc_id !== docId) {
            return res.status(403).json({ success: false, message: 'Invalid doctor or appointment' })
        }

        await supabase.from('appointments').update({ is_completed: true }).eq('id', appointmentId)
        res.json({ success: true, message: 'Appointment Completed' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// List all doctors (public)
const doctorList = async (req, res) => {
    try {
        const { data: doctors, error } = await supabase
            .from('doctors').select('id, name, image, speciality, degree, experience, about, available, fees, slots_booked, address, date')
        if (error) throw error
        res.json({ success: true, doctors })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Toggle availability
const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body
        if (!docId) return res.status(400).json({ success: false, message: 'Doctor ID missing' })

        const { data: doctor, error: fetchErr } = await supabase
            .from('doctors').select('available').eq('id', docId).single()
        if (fetchErr || !doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })

        await supabase.from('doctors').update({ available: !doctor.available }).eq('id', docId)
        res.json({ success: true, message: 'Availability changed successfully' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get doctor profile
const doctorProfile = async (req, res) => {
    try {
        const docId = req.user.id
        const { data: profile, error } = await supabase
            .from('doctors').select('id, name, email, image, speciality, degree, experience, about, available, fees, slots_booked, address, date').eq('id', docId).single()
        if (error) throw error
        res.json({ success: true, profileData: profile })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Update doctor profile
const updateDoctorProfile = async (req, res) => {
    try {
        const docId = req.user.id
        const { fees, address, available, about } = req.body

        const { error } = await supabase
            .from('doctors').update({ fees, address, available, about }).eq('id', docId)
        if (error) throw error
        res.json({ success: true, message: 'Profile Updated' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Doctor dashboard
const doctorDashboard = async (req, res) => {
    try {
        const docId = req.user.id
        const { data: appointments, error } = await supabase
            .from('appointments').select('*').eq('doc_id', docId)
        if (error) throw error

        let earnings = 0
        const patientSet = new Set()
        appointments.forEach(a => {
            if (a.is_completed || a.payment) earnings += a.amount
            patientSet.add(a.user_id)
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

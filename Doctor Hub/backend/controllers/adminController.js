import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'
import { uploadImageFile } from '../src/utils/imageUpload.js'
import supabase from '../config/supabaseClient.js'

function signEnvStaffToken(role, email) {
    return jwt.sign(
        { role, email, id: `env-${role}`, source: 'env' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
}

// Staff login: super admin & legacy admin from .env credentials
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (
            process.env.SUPER_ADMIN_EMAIL &&
            process.env.SUPER_ADMIN_PASSWORD &&
            email === process.env.SUPER_ADMIN_EMAIL &&
            password === process.env.SUPER_ADMIN_PASSWORD
        ) {
            const token = signEnvStaffToken('super_admin', email)
            return res.json({ success: true, token, role: 'super_admin' })
        }

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = signEnvStaffToken('admin', email)
            return res.json({ success: true, token, role: 'admin' })
        }

        res.json({ success: false, message: 'Invalid credentials' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const DEFAULT_DOCTOR_IMAGE =
    'https://ui-avatars.com/api/?name=Doctor&background=0d9488&color=fff&size=256&bold=true'

// Add doctor (schema-safe: CareLink + Module users/doctors)
const addDoctor = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            speciality,
            degree,
            experience,
            about,
            fees,
            address,
            treatmentType,
            diseases,
        } = req.body
        const imageFile = req.file

        if (!name || !email || !password || !speciality || !fees || !address) {
            return res.status(400).json({ success: false, message: 'Missing required fields' })
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email' })
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
        }
        if (!imageFile) {
            return res.status(400).json({ success: false, message: 'Doctor photo is required' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        let imageUrl = DEFAULT_DOCTOR_IMAGE
        try {
            imageUrl = await uploadImageFile(imageFile, { folder: 'doctor-hub/doctors' })
        } catch (uploadErr) {
            console.warn('Doctor photo upload skipped:', uploadErr.message)
        }

        let parsedAddress = { line1: '', line2: '' }
        try {
            parsedAddress = typeof address === 'string' ? JSON.parse(address) : address
        } catch {
            parsedAddress = { line1: String(address || ''), line2: '' }
        }

        const diseaseList = (diseases || '')
            .split(',')
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean)

        const { insertDoctorFromAdmin } = await import('../src/utils/insertDoctorRows.js')
        await insertDoctorFromAdmin({
            name,
            email,
            passwordHash: hashedPassword,
            plainPassword: password,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: parsedAddress,
            treatmentType,
            diseases: diseaseList,
            imageUrl,
        })

        res.json({ success: true, message: 'Doctor added successfully' })
    } catch (error) {
        console.error('addDoctor:', error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// Cancel appointment (admin)
const appointmentCancel = async (req, res) => {
    try {
        const { appointmentId } = req.body

        const { data: appointment, error: fetchErr } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (fetchErr) throw fetchErr

        const { updateAppointmentCancelled } = await import('../src/utils/appointmentDoctorRows.js')
        await updateAppointmentCancelled(appointmentId)

        // Release doctor slot (CareLink only)
        const docId = appointment.doc_id || appointment.doctor_id
        const { slotDate, slotTime } = {
            slotDate: appointment.slot_date,
            slotTime: appointment.slot_time,
        }
        const { data: doctor, error: docErr } = await supabase
            .from('doctors').select('slots_booked').eq('id', docId).single()
        if (docErr) throw docErr

        const slots_booked = doctor.slots_booked || {}
        if (slots_booked[slotDate]) {
            slots_booked[slotDate] = slots_booked[slotDate].filter(t => t !== slotTime)
        }
        await supabase.from('doctors').update({ slots_booked }).eq('id', docId)

        res.json({ success: true, message: 'Appointment Cancelled' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// All doctors (admin list — schema-safe)
const allDoctors = async (req, res) => {
    try {
        const { fetchDoctorRows, loadProfiles, mapLegacyDoctorCard } = await import('../src/utils/doctorRows.js')
        const rows = await fetchDoctorRows()
        const profileIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
        const profiles = await loadProfiles(profileIds)
        const doctors = rows.map((row) => mapLegacyDoctorCard(row, profiles[row.user_id]))
        res.json({ success: true, doctors })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// All appointments (CareLink + Module 001 shapes)
const appointmentsAdmin = async (req, res) => {
    try {
        const { mapAppointmentForAdmin } = await import('../src/utils/appointmentRows.js')
        const { mapAppointmentsForPatientUi } = await import('../src/utils/patientAppointmentRows.js')
        const { mapAppointmentsForDoctorUi } = await import('../src/utils/appointmentDoctorRows.js')

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw error

        let rows = data || []
        if (rows.length && !rows.some((r) => r.user_data?.name && r.doc_data?.name)) {
            const withPatient = await mapAppointmentsForPatientUi(rows)
            rows = await mapAppointmentsForDoctorUi(withPatient)
        }

        const appointments = rows.map(mapAppointmentForAdmin)
        res.json({ success: true, appointments })
    } catch (error) {
        res.json({ success: false, message: error.message, appointments: [] })
    }
}

// Admin dashboard
const adminDashboard = async (req, res) => {
    try {
        const [{ count: doctorCount }, { count: userCount }, { count: appointmentCount }, { data: latestAppointments, error }] = await Promise.all([
            supabase.from('doctors').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('appointments').select('*', { count: 'exact', head: true }),
            supabase.from('appointments').select('*').order('created_at', { ascending: false }).limit(5)
        ])
        if (error) throw error

        res.json({
            success: true,
            dashData: {
                doctors: doctorCount,
                patients: userCount,
                appointments: appointmentCount,
                latestAppointments
            }
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export { loginAdmin, addDoctor, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard }

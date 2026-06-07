import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'
import { v2 as cloudinary } from 'cloudinary'
import supabase from '../config/supabaseClient.js'

// Admin login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            return res.json({ success: true, token })
        }
        res.json({ success: false, message: 'Invalid credentials' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Add doctor
const addDoctor = async (req, res) => {
    try {
        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.status(400).json({ success: false, message: 'Missing Details' })
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email' })
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Please enter a strong password' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' })

        const { error } = await supabase.from('doctors').insert({
            name,
            email,
            password: hashedPassword,
            image: imageUpload.secure_url,
            speciality,
            degree,
            experience,
            about,
            fees: Number(fees),
            address: JSON.parse(address),
            available: true,
            slots_booked: {},
            date: Date.now()
        })

        if (error) throw error
        res.json({ success: true, message: 'Doctor Added' })
    } catch (error) {
        console.error(error)
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

        await supabase.from('appointments').update({ cancelled: true }).eq('id', appointmentId)

        // Release doctor slot
        const { docId, slotDate, slotTime } = appointment
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

// All doctors
const allDoctors = async (req, res) => {
    try {
        const { data: doctors, error } = await supabase
            .from('doctors').select('id, name, email, image, speciality, degree, experience, about, available, fees, slots_booked, address, date')
        if (error) throw error
        res.json({ success: true, doctors })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// All appointments
const appointmentsAdmin = async (req, res) => {
    try {
        const { data: appointments, error } = await supabase.from('appointments').select('*')
        if (error) throw error
        res.json({ success: true, appointments })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Admin dashboard
const adminDashboard = async (req, res) => {
    try {
        const [{ count: doctorCount }, { count: userCount }, { count: appointmentCount }, { data: latestAppointments, error }] = await Promise.all([
            supabase.from('doctors').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('appointments').select('*', { count: 'exact', head: true }),
            supabase.from('appointments').select('*').order('date', { ascending: false }).limit(5)
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

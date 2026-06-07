import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import validator from 'validator'
import supabase from '../config/supabaseClient.js'

const DEFAULT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAACXBIWXMAABCcAAAQnAEmzTo0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADASURBVHgB7cExAQAAAMKg9U9tCy+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBuAABHgAAAABJRU5ErkJggg=='

// Register user
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body
        if (!name || !email || !password) return res.json({ success: false, message: 'Missing Details' })
        if (!validator.isEmail(email)) return res.json({ success: false, message: 'Please enter a valid email' })
        if (password.length < 8) return res.json({ success: false, message: 'Please enter a strong password' })

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const { data: user, error } = await supabase.from('users').insert({
            name,
            email,
            password: hashedPassword,
            image: DEFAULT_IMAGE,
            phone: '000000000',
            address: { line1: '', line2: '' },
            gender: 'Not Selected',
            dob: 'Not Selected'
        }).select('id').single()

        if (error) throw error

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET)
        res.json({ success: true, token })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const { data: user, error } = await supabase
            .from('users').select('*').eq('email', email).single()

        if (error || !user) return res.json({ success: false, message: 'User does not exist' })

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) return res.json({ success: false, message: 'Invalid credentials' })

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET)
        res.json({ success: true, token })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get profile
const getProfile = async (req, res) => {
    try {
        const { userId } = req.body
        const { data: userData, error } = await supabase
            .from('users').select('id, name, email, image, phone, address, gender, dob').eq('id', userId).single()
        if (error) throw error
        res.json({ success: true, userData })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) return res.json({ success: false, message: 'Data Missing' })

        const updates = { name, phone, address: JSON.parse(address), dob, gender }

        if (imageFile) {
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' })
            updates.image = imageUpload.secure_url
        }

        const { error } = await supabase.from('users').update(updates).eq('id', userId)
        if (error) throw error
        res.json({ success: true, message: 'Profile Updated' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Book appointment
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body

        const { data: docData, error: docErr } = await supabase
            .from('doctors').select('*').eq('id', docId).single()
        if (docErr) throw docErr

        if (!docData.available) return res.json({ success: false, message: 'Doctor Not Available' })

        const slots_booked = docData.slots_booked || {}
        if (slots_booked[slotDate]?.includes(slotTime)) {
            return res.json({ success: false, message: 'Slot Not Available' })
        }
        slots_booked[slotDate] = [...(slots_booked[slotDate] || []), slotTime]

        const { data: userData, error: userErr } = await supabase
            .from('users').select('id, name, email, image, phone, address, gender, dob').eq('id', userId).single()
        if (userErr) throw userErr

        const { slots_booked: _sb, password: _pw, ...safeDocData } = docData

        const { error: apptErr } = await supabase.from('appointments').insert({
            user_id: userId,
            doc_id: docId,
            slot_date: slotDate,
            slot_time: slotTime,
            user_data: userData,
            doc_data: safeDocData,
            amount: docData.fees,
            date: Date.now(),
            cancelled: false,
            payment: false,
            is_completed: false
        })
        if (apptErr) throw apptErr

        await supabase.from('doctors').update({ slots_booked }).eq('id', docId)
        res.json({ success: true, message: 'Appointment Booked' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body

        const { data: appointment, error: fetchErr } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (fetchErr) throw fetchErr

        if (appointment.user_id !== userId) return res.json({ success: false, message: 'Unauthorized action' })

        await supabase.from('appointments').update({ cancelled: true }).eq('id', appointmentId)

        const { data: doctor, error: docErr } = await supabase
            .from('doctors').select('slots_booked').eq('id', appointment.doc_id).single()
        if (docErr) throw docErr

        const slots_booked = doctor.slots_booked || {}
        if (slots_booked[appointment.slot_date]) {
            slots_booked[appointment.slot_date] = slots_booked[appointment.slot_date].filter(t => t !== appointment.slot_time)
        }
        await supabase.from('doctors').update({ slots_booked }).eq('id', appointment.doc_id)

        res.json({ success: true, message: 'Appointment Cancelled' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// List user appointments
const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body
        const { data: appointments, error } = await supabase
            .from('appointments').select('*').eq('user_id', userId)
        if (error) throw error
        res.json({ success: true, appointments })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Stripe payment
const paymentSTRIPE = async (req, res) => {
    try {
        const { appointmentId } = req.body
        const { data: appointment, error } = await supabase
            .from('appointments').select('*').eq('id', appointmentId).single()
        if (error || !appointment || appointment.cancelled) {
            return res.json({ success: false, message: 'Appointment cancelled or not found' })
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: (process.env.CURRENCY || 'USD').toLowerCase(),
                    product_data: { name: 'Appointment Payment' },
                    unit_amount: Math.round(appointment.amount * 100)
                },
                quantity: 1
            }],
            mode: 'payment',
            metadata: { appointmentId },
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-appointments?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-appointments`
        })

        res.json({ success: true, sessionId: session.id })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Verify Stripe payment
const verifySTRIPE = async (req, res) => {
    try {
        const { session_id } = req.body
        if (!session_id) return res.json({ success: false, message: 'Missing session_id' })

        const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] })
        const paid = session.payment_status === 'paid' || session?.payment_intent?.status === 'succeeded'

        if (paid && session.metadata?.appointmentId) {
            await supabase.from('appointments').update({ payment: true }).eq('id', session.metadata.appointmentId)
            return res.json({ success: true, message: 'Payment Successful' })
        }
        res.json({ success: false, message: 'Payment not completed' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, cancelAppointment, listAppointment, paymentSTRIPE, verifySTRIPE }

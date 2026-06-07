import bcrypt from 'bcrypt'
import { uploadImageFile } from '../src/utils/imageUpload.js'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import validator from 'validator'
import supabase from '../config/supabaseClient.js'
import {
  bookAppointmentForPatient,
  resolveAppointmentPayAmount,
  stripeUnitAmount,
} from '../src/utils/bookAppointmentRows.js'
import { listPatientAppointmentsForUser } from '../src/utils/patientAppointmentRows.js'

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
            updates.image = await uploadImageFile(imageFile, { folder: 'doctor-hub/profiles' })
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
        const { userId, docId, slotDate, slotTime, symptoms, diseaseQuery } = req.body
        const result = await bookAppointmentForPatient({
            userId,
            docId,
            slotDate,
            slotTime,
            symptoms,
            diseaseQuery,
        })
        res.json(result)
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
        const userId = req.body?.userId || req.userId || req.user?.id
        if (!userId) {
            return res.json({ success: false, message: 'Not authorized', appointments: [] })
        }
        const appointments = await listPatientAppointmentsForUser(userId)
        res.json({ success: true, appointments })
    } catch (error) {
        res.json({ success: false, message: error.message, appointments: [] })
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

        const fee = await resolveAppointmentPayAmount(appointment)
        const unit_amount = stripeUnitAmount(fee)
        if (!unit_amount) {
            return res.json({
                success: false,
                message: fee
                    ? 'Payment amount is too small for online checkout (minimum $0.50)'
                    : 'Appointment fee is not set — ask the doctor or admin to set consultation fee',
            })
        }

        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173'
        const currency = (process.env.CURRENCY || 'USD').toLowerCase()

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency,
                    product_data: {
                        name: 'Appointment Payment',
                        description: appointment.slot_date
                            ? `Visit on ${appointment.slot_date} ${appointment.slot_time || ''}`.trim()
                            : undefined,
                    },
                    unit_amount,
                },
                quantity: 1
            }],
            mode: 'payment',
            metadata: { appointmentId: String(appointmentId) },
            success_url: `${frontend}/patient/appointments?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontend}/patient/appointments`
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
            const payUpdate = { payment: true, status: 'awaiting_verification' }
            let { error: payErr } = await supabase
                .from('appointments')
                .update(payUpdate)
                .eq('id', session.metadata.appointmentId)
            if (payErr && /status|column/i.test(payErr.message)) {
                await supabase
                    .from('appointments')
                    .update({ payment: true })
                    .eq('id', session.metadata.appointmentId)
            }
            return res.json({
                success: true,
                message: 'Payment received — assistant will confirm your slot',
            })
        }
        res.json({ success: false, message: 'Payment not completed' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, cancelAppointment, listAppointment, paymentSTRIPE, verifySTRIPE }

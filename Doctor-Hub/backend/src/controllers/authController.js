import bcrypt from 'bcrypt'

import jwt from 'jsonwebtoken'

import validator from 'validator'

import {

  insertUser,

  findUserByEmail,

  insertPatientProfile,

  insertDoctorProfile,

  resolveUserDisplay,

} from '../utils/authUserRows.js'

import supabase from '../config/supabase.js'
import { uploadImageFile } from '../utils/imageUpload.js'
import { resolveDoctorContextIdsOrCreate } from '../utils/appointmentDoctorRows.js'

import { findPendingRequestByEmail } from '../utils/adminRegistrationRows.js'

import {

  createPasswordResetToken,

  findValidResetToken,

  markResetTokenUsed,

} from '../utils/passwordResetRows.js'

import { sendPasswordResetEmail } from '../services/emailService.js'



const SALT_ROUNDS = 10

const ALLOWED_REGISTER_ROLES = ['patient', 'doctor']



function jwtExpiresIn() {

  return process.env.JWT_EXPIRES_IN || '7d'

}



function signToken(payload) {

  if (!process.env.JWT_SECRET) {

    throw new Error('JWT_SECRET is not configured')

  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn() })

}



function setAuthCookie(res, token) {

  const isProd = process.env.NODE_ENV === 'production'

  res.cookie('token', token, {

    httpOnly: true,

    secure: isProd,

    sameSite: isProd ? 'none' : 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000,

  })

}



function frontendBaseUrl() {

  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')

}



export async function register(req, res) {

  try {

    const full_name = (req.body.full_name || req.body.name || '').trim()
    const { email, password, role, phone } = req.body

    if (!full_name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (password !== req.body.confirm_password && req.body.confirm_password) {

      return res.status(400).json({ message: 'Passwords do not match' })

    }



    const existing = await findUserByEmail(email)

    if (existing) {

      return res.status(400).json({ message: 'Email already registered' })

    }



    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)



    const user = await insertUser({

      email,

      password: hashedPassword,

      role,

      full_name,

      phone,

    })



    try {

      if (role === 'patient') {

        const patientRow = await insertPatientProfile({

          user_id: user.id,

          full_name,

          phone,

        })

        if (patientRow.skipped && patientRow.reason === 'fk_profiles_not_users') {

          return res.status(201).json({

            message: 'Registered successfully',

            warning:

              'Could not complete registration. Please try again or contact support.',

          })

        }

      }

      if (role === 'doctor') {

        await insertDoctorProfile({ user_id: user.id, full_name, phone })

      }

    } catch (profileErr) {

      await supabase.from('users').delete().eq('id', user.id)

      console.error('register profile insert:', profileErr)

      return res.status(500).json({

        message: profileErr.message || 'Could not create profile',

      })

    }



    return res.status(201).json({ message: 'Registered successfully' })

  } catch (err) {

    console.error('register:', err)

    if (err.code === '42501' || /permission denied/i.test(err.message || '')) {

      return res.status(500).json({

        message:

          'Could not complete this action. Please try again or contact support.',

      })

    }

    return res.status(500).json({ message: err.message || 'Registration failed' })

  }

}



export async function login(req, res) {

  try {

    const { email, password } = req.body



    const user = await findUserByEmail(email)



    if (!user) {

      const pending = await findPendingRequestByEmail(email)

      if (pending) {

        return res.status(403).json({

          message:

            'Your admin registration is pending super admin approval. You will be able to sign in after approval.',

        })

      }

      return res.status(401).json({ message: 'Invalid email or password' })

    }



    if (user.is_active === false) {

      return res.status(401).json({ message: 'Account is deactivated' })

    }



    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {

      return res.status(401).json({ message: 'Invalid email or password' })

    }



    const role = user.role || 'patient'

    const display = await resolveUserDisplay(user)

    const payload = { id: user.id, email: user.email, role }

    const token = signToken(payload)



    setAuthCookie(res, token)



    return res.json({

      user: {

        id: user.id,

        email: user.email,

        role,

        name: display.name,

        full_name: display.name,

        image: display.image,

      },

      token,

    })

  } catch (err) {

    console.error('login:', err)

    return res.status(500).json({ message: err.message || 'Login failed' })

  }

}



export async function logout(req, res) {

  res.clearCookie('token', {

    httpOnly: true,

    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',

    secure: process.env.NODE_ENV === 'production',

  })

  return res.json({ message: 'Logged out' })

}



export async function getMe(req, res) {

  try {

    const userId = req.user?.id

    if (!userId) {

      return res.status(401).json({ message: 'Authentication required' })

    }



    const { data: row, error } = await supabase

      .from('users')

      .select('id, email, role, name, image, phone, address, gender, dob')

      .eq('id', userId)

      .maybeSingle()



    if (error) throw error

    if (!row) {

      return res.status(404).json({ message: 'User not found' })

    }



    const display = await resolveUserDisplay(row)

    return res.json({

      user: {

        id: row.id,

        email: row.email,

        role: row.role || req.user.role || 'patient',

        name: display.name,

        full_name: display.name,

        image: display.image,

        phone: row.phone || null,

        address: row.address || { line1: '', line2: '' },

        gender: row.gender || null,

        dob: row.dob || null,

      },

    })

  } catch (err) {

    console.error('getMe:', err)

    return res.status(500).json({ message: err.message || 'Failed to load profile' })

  }

}



export async function updateMyProfile(req, res) {

  try {

    const userId = req.user?.id

    if (!userId) {

      return res.status(401).json({ success: false, message: 'Authentication required' })

    }



    const { name, phone, gender, dob, address } = req.body

    const updates = {}



    if (name !== undefined && String(name).trim()) {

      updates.name = String(name).trim()

    }

    if (phone !== undefined) updates.phone = phone

    if (gender !== undefined) updates.gender = gender

    if (dob !== undefined) updates.dob = dob

    if (address !== undefined) {

      try {

        updates.address = typeof address === 'string' ? JSON.parse(address) : address

      } catch {

        return res.status(400).json({ success: false, message: 'Invalid address format' })

      }

    }



    if (req.file) {

      updates.image = await uploadImageFile(req.file, { folder: 'doctor-hub/profiles' })

    }



    if (Object.keys(updates).length) {

      const { error } = await supabase.from('users').update(updates).eq('id', userId)

      if (error) throw error

    }



    const role = req.user?.role

    if (updates.image && (role === 'doctor' || !role)) {

      try {

        const { doctorRowId } = await resolveDoctorContextIdsOrCreate(userId)

        if (doctorRowId) {

          const imgPatch = { profile_image: updates.image, image: updates.image }

          for (const patch of [imgPatch, { profile_image: updates.image }]) {

            const { error: docErr } = await supabase

              .from('doctors')

              .update(patch)

              .eq('id', doctorRowId)

            if (!docErr) break

          }

        }

      } catch {

        /* optional doctor row */

      }

    }



    const { data: row } = await supabase

      .from('users')

      .select('id, email, role, name, image, phone, address, gender, dob')

      .eq('id', userId)

      .maybeSingle()



    const display = await resolveUserDisplay(row || { id: userId })



    return res.json({

      success: true,

      message: 'Profile updated',

      user: {

        id: row?.id || userId,

        email: row?.email || req.user?.email,

        role: row?.role || role || 'patient',

        name: display.name,

        full_name: display.name,

        image: display.image,

        phone: row?.phone || null,

        address: row?.address || { line1: '', line2: '' },

        gender: row?.gender || null,

        dob: row?.dob || null,

      },

    })

  } catch (err) {

    console.error('updateMyProfile:', err)

    return res.status(500).json({ success: false, message: err.message || 'Update failed' })

  }

}



export async function forgotPassword(req, res) {

  try {

    const { email } = req.body

    const normalized = email?.toLowerCase?.().trim()



    const user = await findUserByEmail(normalized)

    if (!user) {

      return res.status(404).json({ message: 'No account found with this email' })

    }



    const { token } = await createPasswordResetToken(user.id)

    const resetUrl = `${frontendBaseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`



    const display = await resolveUserDisplay(user)

    const emailResult = await sendPasswordResetEmail({

      to: normalized,

      resetUrl,

      userName: display.name,

    })



    const payload = {

      message: emailResult.sent

        ? 'Password reset link sent to your email'

        : 'Password reset link generated. Check server logs if email is not configured.',

    }



    if (!emailResult.sent && process.env.NODE_ENV !== 'production') {

      payload.devResetUrl = resetUrl

    }



    return res.json(payload)

  } catch (err) {

    console.error('forgotPassword:', err)

    if (/password_reset_tokens|relation.*does not exist/i.test(err.message || '')) {

      return res.status(500).json({

        message: 'Password reset is temporarily unavailable. Please try again later or contact support.',

      })

    }

    return res.status(500).json({ message: err.message || 'Request failed' })

  }

}



export async function resetPassword(req, res) {

  try {

    const { token, password, confirm_password } = req.body



    if (password !== confirm_password) {

      return res.status(400).json({ message: 'Passwords do not match' })

    }



    const row = await findValidResetToken(token)

    if (!row) {

      return res.status(400).json({ message: 'Invalid or expired reset link. Request a new one.' })

    }



    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)



    const { error: updateErr } = await supabase

      .from('users')

      .update({ password: hashedPassword })

      .eq('id', row.user_id)



    if (updateErr) throw updateErr



    await markResetTokenUsed(row.id)



    return res.json({ message: 'Password updated successfully. You can sign in now.' })

  } catch (err) {

    console.error('resetPassword:', err)

    return res.status(500).json({ message: err.message || 'Could not reset password' })

  }

}



export async function validateResetToken(req, res) {

  try {

    const token = req.query.token || req.body?.token

    if (!token) {

      return res.status(400).json({ valid: false, message: 'Token is required' })

    }

    const row = await findValidResetToken(token)

    if (!row) {

      return res.json({ valid: false, message: 'Invalid or expired reset link' })

    }

    return res.json({ valid: true })

  } catch (err) {

    return res.status(500).json({ valid: false, message: err.message })

  }

}



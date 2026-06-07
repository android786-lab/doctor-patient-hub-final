import bcrypt from 'bcrypt'
import validator from 'validator'
import { findUserByEmail, insertUser } from '../utils/authUserRows.js'
import {
  findPendingRequestByEmail,
  findAnyRequestByEmail,
  insertAdminRegistrationRequest,
  listAdminRegistrationRequests,
  getAdminRegistrationRequestById,
  updateAdminRegistrationRequest,
} from '../utils/adminRegistrationRows.js'

const SALT_ROUNDS = 10

/** Env / JWT staff ids like env-super_admin are not UUIDs — DB reviewed_by must be null or a real user id. */
async function resolveReviewerUserId(user) {
  const rawId = user?.id
  if (rawId && validator.isUUID(String(rawId))) {
    return rawId
  }
  const email = user?.email?.toLowerCase?.()?.trim()
  if (email && validator.isEmail(email)) {
    const dbUser = await findUserByEmail(email)
    if (dbUser?.id && validator.isUUID(String(dbUser.id))) {
      return dbUser.id
    }
  }
  return null
}

export async function registerAdminRequest(req, res) {
  try {
    const { full_name, email, password, phone, organization_name, message } = req.body

    if (!full_name?.trim() || !email || !password || !phone?.trim()) {
      return res.status(400).json({
        message: 'Full name, email, password, and contact number are required',
      })
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }
    if (!/^[\d\s+\-()]{7,20}$/.test(phone.trim())) {
      return res.status(400).json({ message: 'Enter a valid contact number' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await findUserByEmail(normalizedEmail)
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' })
    }

    const pending = await findPendingRequestByEmail(normalizedEmail)
    if (pending) {
      return res.status(400).json({
        message: 'A registration request is already pending super admin approval',
      })
    }

    const lastReq = await findAnyRequestByEmail(normalizedEmail)
    if (lastReq?.status === 'approved') {
      return res.status(400).json({
        message: 'This email was already approved. Please sign in instead.',
      })
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    const row = await insertAdminRegistrationRequest({
      full_name,
      email: normalizedEmail,
      password_hash,
      phone,
      organization_name,
      message,
    })

    return res.status(201).json({
      message:
        'Your registration request has been sent to the super admin for approval. You will be notified once approved — then you can sign in here with your email and password.',
      requestId: row.id,
      status: row.status,
    })
  } catch (err) {
    console.error('registerAdminRequest:', err)
    return res.status(500).json({ message: err.message || 'Registration failed' })
  }
}

export async function getAdminRegistrationStatus(req, res) {
  try {
    const email = (req.query.email || '').toLowerCase().trim()
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: 'Valid email query is required' })
    }

    const user = await findUserByEmail(email)
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return res.json({ status: 'approved', canLogin: true })
    }

    const pending = await findPendingRequestByEmail(email)
    if (pending) {
      return res.json({
        status: 'pending',
        canLogin: false,
        message: 'Your request is pending super admin approval.',
      })
    }

    const last = await findAnyRequestByEmail(email)
    if (last?.status === 'rejected') {
      return res.json({
        status: 'rejected',
        canLogin: false,
        message: last.rejection_reason || 'Your request was not approved.',
      })
    }

    return res.json({ status: 'none', canLogin: false })
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to check status' })
  }
}

export async function listAdminRequestsForSuperAdmin(req, res) {
  try {
    const status = req.query.status || undefined
    const requests = await listAdminRegistrationRequests({ status })
    return res.json({ requests })
  } catch (err) {
    console.error('listAdminRequestsForSuperAdmin:', err)
    return res.status(500).json({ message: err.message || 'Failed to load requests' })
  }
}

export async function approveAdminRequest(req, res) {
  try {
    const { id } = req.params
    const request = await getAdminRegistrationRequestById(id)

    if (!request) {
      return res.status(404).json({ message: 'Registration request not found' })
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' })
    }

    const reviewedBy = await resolveReviewerUserId(req.user)

    const existingUser = await findUserByEmail(request.email)
    if (existingUser) {
      await updateAdminRegistrationRequest(id, {
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        created_user_id: existingUser.id,
      })
      return res.json({
        message: 'User already exists — request marked approved',
        userId: existingUser.id,
      })
    }

    const user = await insertUser({
      email: request.email,
      password: request.password_hash,
      role: 'admin',
      full_name: request.full_name,
      phone: request.phone,
    })

    await updateAdminRegistrationRequest(id, {
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      created_user_id: user.id,
    })

    return res.json({
      message: 'Admin approved. They can now sign in with their email and password.',
      userId: user.id,
    })
  } catch (err) {
    console.error('approveAdminRequest:', err)
    return res.status(500).json({ message: err.message || 'Failed to approve' })
  }
}

export async function rejectAdminRequest(req, res) {
  try {
    const { id } = req.params
    const { reason } = req.body

    const request = await getAdminRegistrationRequestById(id)
    if (!request) {
      return res.status(404).json({ message: 'Registration request not found' })
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' })
    }

    const reviewedBy = await resolveReviewerUserId(req.user)

    await updateAdminRegistrationRequest(id, {
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || 'Not approved at this time',
    })

    return res.json({ message: 'Registration request rejected' })
  } catch (err) {
    console.error('rejectAdminRequest:', err)
    return res.status(500).json({ message: err.message || 'Failed to reject' })
  }
}

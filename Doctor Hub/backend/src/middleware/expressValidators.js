import { body, param, query, validationResult } from 'express-validator'

export function handleValidationErrors(req, res, next) {
  const result = validationResult(req)
  if (!result.isEmpty()) {
    const errors = result.array({ onlyFirstError: false })
    return res.status(400).json({
      success: false,
      message: errors[0]?.msg || 'Validation failed',
      errors: errors.map((e) => ({ field: e.path, msg: e.msg })),
    })
  }
  return next()
}

export const authLoginValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
]

export const authRegisterValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['patient', 'doctor']).withMessage('role must be patient or doctor'),
  body('phone').trim().isLength({ min: 7, max: 20 }).withMessage('Valid phone is required'),
  body('full_name').optional().trim().isLength({ min: 2, max: 120 }),
  body('name').optional().trim().isLength({ min: 2, max: 120 }),
  body().custom((_, { req }) => {
    const n = (req.body.full_name || req.body.name || '').trim()
    if (!n) throw new Error('Name is required (full_name or name)')
    return true
  }),
  handleValidationErrors,
]

export const authForgotPasswordValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  handleValidationErrors,
]

export const authResetPasswordValidators = [
  body('token').trim().isLength({ min: 32 }).withMessage('Invalid reset token'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirm_password').isLength({ min: 6 }).withMessage('Confirm password is required'),
  handleValidationErrors,
]

export const bookAppointmentValidators = [
  body('doctorId').optional().isUUID().withMessage('doctorId must be a valid UUID'),
  body('docId').optional().isUUID(),
  body('date').optional().isISO8601({ strict: false }),
  body('timeSlot').optional().trim().isLength({ min: 1, max: 32 }),
  body('slotDate').optional().trim(),
  body('slotTime').optional().trim(),
  handleValidationErrors,
]

export const paymentManualValidators = [
  body('appointmentId').isUUID().withMessage('appointmentId must be a valid UUID'),
  body('paymentMethod').optional().trim().isLength({ max: 32 }),
  body('reference').optional().trim().isLength({ max: 120 }),
  handleValidationErrors,
]

export const doctorMedicalHistoryValidators = [
  body('appointmentId').isUUID().withMessage('appointmentId must be a valid UUID'),
  body('patientId').optional().isUUID(),
  body('diagnosis').trim().notEmpty().withMessage('diagnosis is required').isLength({ max: 500 }),
  body('symptoms').optional().trim().isLength({ max: 1000 }),
  body('notes').optional().trim().isLength({ max: 5000 }),
  handleValidationErrors,
]

export const doctorPrescriptionValidators = [
  body('appointmentId').isUUID().withMessage('appointmentId must be a valid UUID'),
  body('medicalHistoryId').isUUID().withMessage('medicalHistoryId must be a valid UUID'),
  body('patientId').optional().isUUID(),
  body('instructions').optional().trim().isLength({ max: 2000 }),
  body('medicines').isArray({ min: 1 }).withMessage('medicines array is required'),
  body('medicines.*.name').optional().trim().notEmpty(),
  body('medicines.*.medicine_name').optional().trim().notEmpty(),
  handleValidationErrors,
]

export const uuidParam = (name) => [
  param(name).isUUID().withMessage(`${name} must be a valid UUID`),
  handleValidationErrors,
]

export const adminAppointmentsQueryValidators = [
  query('status').optional().trim().isIn([
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'awaiting_verification',
    'payment_uploaded',
    'rejected',
  ]),
  query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
  handleValidationErrors,
]

export const promoteAdminValidators = [
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('userId').optional().isUUID(),
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.userId) {
      throw new Error('email or userId is required')
    }
    return true
  }),
  handleValidationErrors,
]

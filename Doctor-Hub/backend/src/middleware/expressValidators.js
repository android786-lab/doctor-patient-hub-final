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

export const authVerifyOtpValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').trim().matches(/^\d{6}$/).withMessage('OTP must be a 6-digit code'),
  handleValidationErrors,
]

export const authResetPasswordValidators = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirm_password').isLength({ min: 6 }).withMessage('Confirm password is required'),
  body().custom((_, { req }) => {
    const t = req.body.reset_token || req.body.token
    if (!t || String(t).trim().length < 32) {
      throw new Error('Invalid reset token')
    }
    return true
  }),
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

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const HH_MM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export const createClinicValidators = [
  body('name').trim().isLength({ min: 3 }).withMessage('name is required and must be at least 3 characters'),
  body('address').trim().notEmpty().withMessage('address is required'),
  body('city').trim().notEmpty().withMessage('city is required'),
  body('doctor_id').isUUID().withMessage('doctor_id must be a valid UUID'),
  body('phone').optional().trim().isLength({ max: 32 }),
  body('timings').optional().isObject(),
  handleValidationErrors,
]

export const createClinicScheduleValidators = [
  param('id').isUUID().withMessage('Clinic id must be a valid UUID'),
  body('day_of_week')
    .trim()
    .isIn(WEEKDAY_NAMES)
    .withMessage(`day_of_week must be one of: ${WEEKDAY_NAMES.join(', ')}`),
  body('start_time')
    .trim()
    .matches(HH_MM_RE)
    .withMessage('start_time must be in HH:MM format'),
  body('end_time')
    .trim()
    .matches(HH_MM_RE)
    .withMessage('end_time must be in HH:MM format'),
  body('slot_duration_minutes')
    .isInt({ min: 10, max: 60 })
    .withMessage('slot_duration_minutes must be a number between 10 and 60'),
  body().custom((_, { req }) => {
    const { start_time, end_time } = req.body
    if (!HH_MM_RE.test(start_time || '') || !HH_MM_RE.test(end_time || '')) return true
    if (timeToMinutes(end_time) <= timeToMinutes(start_time)) {
      throw new Error('end_time must be after start_time')
    }
    return true
  }),
  handleValidationErrors,
]

export const assignDoctorAssistantValidators = [
  param('id').isUUID().withMessage('Doctor id must be a valid UUID'),
  body('assistant_id').isUUID().withMessage('assistant_id must be a valid UUID'),
  handleValidationErrors,
]

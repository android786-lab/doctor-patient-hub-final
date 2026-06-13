import { Router } from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import { validate, schemas } from '../middleware/validate.js'
import { authRateLimiter } from '../middleware/authRateLimit.js'
import {
  authLoginValidators,
  authRegisterValidators,
  authForgotPasswordValidators,
  authResetPasswordValidators,
} from '../middleware/expressValidators.js'
import upload from '../../middlewares/multer.js'
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getMe,
  updateMyProfile,
} from '../controllers/authController.js'
import {
  registerAdminRequest,
  getAdminRegistrationStatus,
} from '../controllers/adminRegistrationController.js'

const router = Router()

router.get('/me', authMiddleware, getMe)
router.patch('/profile', upload.single('image'), authMiddleware, updateMyProfile)
router.post('/profile', upload.single('image'), authMiddleware, updateMyProfile)
router.post('/register', authRateLimiter, authRegisterValidators, register)
router.post('/register-admin', authRateLimiter, registerAdminRequest)
router.get('/admin-registration/status', getAdminRegistrationStatus)
router.post('/login', authRateLimiter, authLoginValidators, login)
router.post('/logout', logout)
router.post('/forgot-password', authRateLimiter, authForgotPasswordValidators, forgotPassword)
router.post('/reset-password', authRateLimiter, authResetPasswordValidators, resetPassword)
router.get('/reset-password/validate', validateResetToken)

export default router

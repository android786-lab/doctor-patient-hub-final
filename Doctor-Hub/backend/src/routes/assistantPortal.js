import { Router } from 'express'
import authAdmin from '../../middlewares/authAdmin.js'
import { requireRoles } from '../middleware/requireRoles.js'
import attachAssistantScope from '../middleware/attachAssistantScope.js'
import {
  getAssistantMe,
  getAssistantPortalDashboard,
  listPaymentsVerification,
  confirmAppointment,
  rejectAppointment,
} from '../../controllers/assistantController.js'
import {
  getPendingPayments,
  verifyPayment,
  rejectPayment,
  getAssistantAppointments,
  getAssistantBookings,
  getAssistantDashboardStats,
  getPatientAppointmentHistory,
} from '../controllers/assistantPortalController.js'

const router = Router()

const assistantOnly = [authAdmin, requireRoles('assistant'), attachAssistantScope]

router.use(...assistantOnly)

router.get('/me', getAssistantMe)
router.get('/dashboard', getAssistantPortalDashboard)
router.get('/dashboard/stats', getAssistantDashboardStats)

/** Module — doc-aligned paths */
router.get('/pending-payments', getPendingPayments)
router.put('/payments/:id/verify', verifyPayment)
router.put('/payments/:id/reject', rejectPayment)
router.get('/appointments', getAssistantAppointments)
router.get('/bookings', getAssistantBookings)
router.get('/patients/:patientId/history', getPatientAppointmentHistory)

/** Legacy assistant payment UI */
router.get('/payments/verification', listPaymentsVerification)
router.post('/payments/confirm', confirmAppointment)
router.post('/payments/reject', rejectAppointment)

export default router

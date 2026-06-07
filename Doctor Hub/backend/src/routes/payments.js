import { Router } from 'express'
import { paymentSTRIPE, verifySTRIPE } from '../../controllers/userController.js'
import {
  listAwaitingVerification,
  listPaymentsVerification,
  confirmAppointment,
  rejectAppointment,
} from '../../controllers/assistantController.js'
import authUser from '../../middlewares/authUser.js'
import authPatient from '../middleware/authPatient.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { uploadPayment } from '../controllers/patientPortalController.js'
import authAdmin from '../../middlewares/authAdmin.js'
import attachAssistantScope from '../middleware/attachAssistantScope.js'
import paymentScreenshotUpload from '../../middlewares/paymentScreenshotUpload.js'
import { paymentManualValidators } from '../middleware/expressValidators.js'
import { paymentManual } from '../controllers/manualPaymentController.js'

const router = Router()

router.post('/checkout', authUser, paymentSTRIPE)
router.post(
  '/',
  paymentScreenshotUpload.single('screenshot'),
  authPatient,
  roleMiddleware('patient'),
  paymentManualValidators,
  uploadPayment
)
router.post('/manual', paymentScreenshotUpload.single('screenshot'), authUser, paymentManualValidators, paymentManual)
router.post('/verify', authUser, verifySTRIPE)
router.get('/pending', authAdmin, attachAssistantScope, listAwaitingVerification)
router.get('/verification', authAdmin, attachAssistantScope, listPaymentsVerification)
router.post('/confirm', authAdmin, attachAssistantScope, confirmAppointment)
router.post('/reject', authAdmin, attachAssistantScope, rejectAppointment)

export default router

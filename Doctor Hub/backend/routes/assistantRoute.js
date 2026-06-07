import express from 'express'
import authAdmin from '../middlewares/authAdmin.js'
import {
  listAwaitingVerification,
  confirmAppointment,
} from '../controllers/assistantController.js'

const router = express.Router()

router.get('/pending-payments', authAdmin, listAwaitingVerification)
router.post('/confirm-appointment', authAdmin, confirmAppointment)

export default router

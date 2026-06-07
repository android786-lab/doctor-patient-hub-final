import { Router } from 'express'
import authPatient from '../middleware/authPatient.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import {
  getPatientAppointments,
  getPatientHistory,
  getPatientPrescriptions,
  bookAppointment,
  uploadPayment,
} from '../controllers/patientPortalController.js'

const router = Router()

const patientOnly = [authPatient, roleMiddleware('patient')]

router.get('/appointments', patientOnly, getPatientAppointments)
router.get('/history', patientOnly, getPatientHistory)
router.get('/prescriptions', patientOnly, getPatientPrescriptions)

export default router

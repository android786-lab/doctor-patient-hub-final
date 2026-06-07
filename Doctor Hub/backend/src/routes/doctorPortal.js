import { Router } from 'express'
import authDoctor from '../../middlewares/authDoctor.js'
import requireDoctor from '../middleware/requireDoctor.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import {
  getDoctorPortalProfile,
  setupDoctorProfile,
  updateDoctorProfilePut,
  addDoctorClinic,
  listDoctorClinics,
  getDoctorSchedulePortal,
  setDoctorSchedulePortal,
  listDoctorAppointmentsPortal,
  listDoctorPatientsPortal,
  getDoctorPortalDashboard,
  getDoctorAssistant,
} from '../controllers/doctorPortalController.js'
import {
  createDoctorMedicalHistory,
  getDoctorPatientMedicalHistory,
  createDoctorPrescription,
  getDoctorPatientPrescriptions,
  forbidPrescriptionMutation,
} from '../controllers/doctorMedicalController.js'
import assertDoctorAppointment from '../middleware/assertDoctorAppointment.js'
import {
  doctorMedicalHistoryValidators,
  doctorPrescriptionValidators,
  uuidParam,
} from '../middleware/expressValidators.js'

const router = Router()

const doctorOnly = [authDoctor, requireDoctor, roleMiddleware('doctor')]

router.get('/dashboard', doctorOnly, getDoctorPortalDashboard)
router.get('/assistant', doctorOnly, getDoctorAssistant)

router.get('/profile', doctorOnly, getDoctorPortalProfile)
router.post('/profile', doctorOnly, setupDoctorProfile)
router.put('/profile', doctorOnly, updateDoctorProfilePut)

router.post('/clinic', doctorOnly, addDoctorClinic)
router.get('/clinics', doctorOnly, listDoctorClinics)

router.get('/schedule', doctorOnly, getDoctorSchedulePortal)
router.post('/schedule', doctorOnly, setDoctorSchedulePortal)

router.get('/appointments', doctorOnly, listDoctorAppointmentsPortal)
router.get('/patients', doctorOnly, listDoctorPatientsPortal)

router.post(
  '/medical-history',
  doctorOnly,
  doctorMedicalHistoryValidators,
  assertDoctorAppointment,
  createDoctorMedicalHistory
)
router.get(
  '/medical-history/:patientId',
  doctorOnly,
  ...uuidParam('patientId'),
  getDoctorPatientMedicalHistory
)

router.post(
  '/prescription',
  doctorOnly,
  doctorPrescriptionValidators,
  assertDoctorAppointment,
  createDoctorPrescription
)
router.put('/prescription/:id', doctorOnly, forbidPrescriptionMutation)
router.patch('/prescription/:id', doctorOnly, forbidPrescriptionMutation)
router.delete('/prescription/:id', doctorOnly, forbidPrescriptionMutation)
router.get(
  '/prescriptions/:patientId',
  doctorOnly,
  ...uuidParam('patientId'),
  getDoctorPatientPrescriptions
)

export default router

import { Router } from 'express'
import {
  listDoctorsPublic,
  getDoctorByIdPublic,
  listDoctorsLegacy,
  assignAssistantToDoctor,
} from '../controllers/doctorsController.js'
import { getDoctorAvailableSlots } from '../controllers/slotsController.js'
import { listDoctorCatalog } from '../controllers/doctorCatalogController.js'
import {
  doctorDashboard,
  doctorProfile,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  updateDoctorProfile,
  changeAvailability,
} from '../../controllers/doctorController.js'
import {
  addDoctor,
  allDoctors,
  adminDashboard,
} from '../../controllers/adminController.js'
import authDoctor from '../../middlewares/authDoctor.js'
import authAdmin from '../../middlewares/authAdmin.js'
import upload from '../../middlewares/multer.js'
import { assignDoctorAssistantValidators } from '../middleware/expressValidators.js'

const router = Router()

/** Public search (Module — doctor directory) */
router.get('/catalog', listDoctorCatalog)
router.get('/', listDoctorsPublic)

router.get('/dashboard', authDoctor, doctorDashboard)
router.get('/profile', authDoctor, doctorProfile)
router.get('/appointments', authDoctor, appointmentsDoctor)
router.post('/appointments/cancel', authDoctor, appointmentCancel)
router.post('/appointments/complete', authDoctor, appointmentComplete)
router.post('/profile', authDoctor, updateDoctorProfile)
router.post('/availability', authDoctor, changeAvailability)

router.post('/', authAdmin, upload.single('image'), addDoctor)
router.get('/admin/all', authAdmin, allDoctors)
router.get('/admin/dashboard', authAdmin, adminDashboard)

router.post(
  '/:id/assistants',
  authAdmin,
  assignDoctorAssistantValidators,
  assignAssistantToDoctor
)

/** Public single doctor — must be after named GET routes */
router.get('/:id/available-slots', getDoctorAvailableSlots)
router.get('/:id', getDoctorByIdPublic)

/** Legacy list shape for CareLink UI */
router.get('/legacy/list', listDoctorsLegacy)

export default router

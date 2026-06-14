import { Router } from 'express'
import authDoctor from '../../middlewares/authDoctor.js'
import {
  listMyClinics,
  createClinic,
  createClinicSchedule,
  updateClinic,
} from '../controllers/clinicsController.js'
import {
  createClinicValidators,
  createClinicScheduleValidators,
  uuidParam,
} from '../middleware/expressValidators.js'

const router = Router()

router.get('/my', authDoctor, listMyClinics)
router.post('/', authDoctor, createClinicValidators, createClinic)
router.post('/:id/schedule', authDoctor, createClinicScheduleValidators, createClinicSchedule)
router.patch('/:id', authDoctor, ...uuidParam('id'), updateClinic)

export default router

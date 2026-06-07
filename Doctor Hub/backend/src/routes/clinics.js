import { Router } from 'express'
import authDoctor from '../../middlewares/authDoctor.js'
import { listMyClinics, createClinic, updateClinic } from '../controllers/clinicsController.js'

const router = Router()

router.get('/my', authDoctor, listMyClinics)
router.post('/', authDoctor, createClinic)
router.patch('/:id', authDoctor, updateClinic)

export default router

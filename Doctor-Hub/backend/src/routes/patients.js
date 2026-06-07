import { Router } from 'express'
import { getProfile, updateProfile } from '../../controllers/userController.js'
import authUser from '../../middlewares/authUser.js'
import upload from '../../middlewares/multer.js'

const router = Router()

router.get('/profile', authUser, getProfile)
router.put('/profile', upload.single('image'), authUser, updateProfile)
router.post('/update-profile', upload.single('image'), authUser, updateProfile)

export default router

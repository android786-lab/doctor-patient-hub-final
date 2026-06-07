import { Router } from 'express'
import authUser from '../middlewares/authUser.js'
import { legacyListHistory } from '../src/controllers/historyController.js'

const router = Router()

router.post('/list', authUser, legacyListHistory)

export default router

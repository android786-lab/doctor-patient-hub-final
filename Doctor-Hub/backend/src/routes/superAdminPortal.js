import { Router } from 'express'
import authAdmin from '../../middlewares/authAdmin.js'
import { requireRoles } from '../middleware/requireRoles.js'
import {
  listAdmins,
  promoteToAdmin,
  demoteAdmin,
  deleteUserById,
} from '../controllers/superAdminPortalController.js'
import { promoteAdminValidators, uuidParam } from '../middleware/expressValidators.js'

const router = Router()

router.use(authAdmin, requireRoles('super_admin'))

router.get('/admins', listAdmins)
router.post('/admins', promoteAdminValidators, promoteToAdmin)
router.patch('/admins/demote', demoteAdmin)
router.delete('/users/:id', ...uuidParam('id'), deleteUserById)

export default router

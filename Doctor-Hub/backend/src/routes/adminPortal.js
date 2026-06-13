import { Router } from 'express'
import authAdmin from '../../middlewares/authAdmin.js'
import upload from '../../middlewares/multer.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { validate, schemas } from '../middleware/validate.js'
import {
  listDoctorsAdmin,
  listPatientsAdmin,
  verifyDoctor,
  unverifyDoctor,
  listAppointmentsAdmin,
  listPaymentsAdmin,
  getAdminAnalyticsHandler,
  deactivateUser,
  createAssistant,
  assignAssistant,
  changeUserRole,
  listAllUsers,
  getAssistantDashboard,
  listAssistantsAndDoctors,
} from '../controllers/adminPortalController.js'
import { getSuperAdminOverview } from '../controllers/superAdminController.js'
import { adminAppointmentsQueryValidators } from '../middleware/expressValidators.js'
import {
  listAdminRequestsForSuperAdmin,
  approveAdminRequest,
  rejectAdminRequest,
} from '../controllers/adminRegistrationController.js'
import { postCatalogEntry } from '../controllers/doctorCatalogController.js'

const router = Router()

router.post(
  '/catalog',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  postCatalogEntry
)
router.get(
  '/doctors',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  listDoctorsAdmin
)
router.get(
  '/patients',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  listPatientsAdmin
)
router.put(
  '/doctors/:id/verify',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  verifyDoctor
)
router.put(
  '/doctors/:id/unverify',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  unverifyDoctor
)
router.patch(
  '/doctors/:id/verify',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  verifyDoctor
)
router.get(
  '/appointments',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  adminAppointmentsQueryValidators,
  listAppointmentsAdmin
)
router.get(
  '/payments',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  listPaymentsAdmin
)
router.get(
  '/analytics',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  getAdminAnalyticsHandler
)
router.patch(
  '/users/:id/deactivate',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  deactivateUser
)

router.get(
  '/assistant/dashboard',
  authAdmin,
  requireRoles('admin', 'super_admin', 'assistant'),
  getAssistantDashboard
)
router.get(
  '/assign-options',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  listAssistantsAndDoctors
)
router.post(
  '/assistants',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  upload.single('image'),
  validate(schemas.createAssistant),
  createAssistant
)
router.patch(
  '/assistants/assign',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  validate(schemas.assignAssistant),
  assignAssistant
)
router.get('/users', authAdmin, requireRoles('admin', 'super_admin'), listAllUsers)
router.patch(
  '/users/:id/role',
  authAdmin,
  requireRoles('admin', 'super_admin'),
  changeUserRole
)

router.get(
  '/super/overview',
  authAdmin,
  requireRoles('super_admin'),
  getSuperAdminOverview
)
router.get(
  '/registration-requests',
  authAdmin,
  requireRoles('super_admin'),
  listAdminRequestsForSuperAdmin
)
router.patch(
  '/registration-requests/:id/approve',
  authAdmin,
  requireRoles('super_admin'),
  approveAdminRequest
)
router.patch(
  '/registration-requests/:id/reject',
  authAdmin,
  requireRoles('super_admin'),
  rejectAdminRequest
)

export default router

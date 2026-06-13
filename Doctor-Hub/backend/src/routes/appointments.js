import { Router } from 'express'
import {
  bookAppointment,
  listAppointment,
  cancelAppointment,
} from '../../controllers/userController.js'
import {
  appointmentsDoctor,
  appointmentCancel as doctorCancel,
  appointmentComplete,
} from '../../controllers/doctorController.js'
import { appointmentsAdmin, appointmentCancel as adminCancel } from '../../controllers/adminController.js'
import authUser from '../../middlewares/authUser.js'
import authDoctor from '../../middlewares/authDoctor.js'
import authAdmin from '../../middlewares/authAdmin.js'
import authPatient from '../middleware/authPatient.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'
import { bookAppointment as bookAppointmentModule } from '../controllers/patientPortalController.js'
import { bookAppointmentValidators } from '../middleware/expressValidators.js'
import { getMyAppointments, getDoctorDashboard } from '../controllers/appointmentsController.js'
import authConsultParticipant from '../middleware/authConsultParticipant.js'
import {
  getChatSession,
  getChatMessages,
  postChatMessage,
  postVideoRoom,
  getChatUnread,
  getChatInbox,
  postChatMarkRead,
} from '../controllers/appointmentChatController.js'
import {
  postWebRtcSignalMessage,
  getWebRtcSignals,
} from '../controllers/webrtcController.js'

const router = Router()

router.get('/my', authPatient, getMyAppointments)
router.post(
  '/',
  authPatient,
  roleMiddleware('patient'),
  bookAppointmentValidators,
  bookAppointmentModule
)
router.get('/doctor/dashboard', authDoctor, getDoctorDashboard)

router.get('/chat/unread', authConsultParticipant, getChatUnread)
router.get('/chat/inbox', authConsultParticipant, getChatInbox)
router.get('/chat/:appointmentId/session', authConsultParticipant, getChatSession)
router.post('/chat/:appointmentId/read', authConsultParticipant, postChatMarkRead)
router.get('/chat/:appointmentId/messages', authConsultParticipant, getChatMessages)
router.post('/chat/:appointmentId/messages', authConsultParticipant, postChatMessage)
router.post('/chat/:appointmentId/video', authConsultParticipant, postVideoRoom)
router.post('/chat/:appointmentId/webrtc/signal', authConsultParticipant, postWebRtcSignalMessage)
router.get('/chat/:appointmentId/webrtc/signals', authConsultParticipant, getWebRtcSignals)

router.post('/legacy', authUser, bookAppointment)
router.get('/', authUser, listAppointment)
router.post('/cancel', authUser, cancelAppointment)

router.get('/doctor', authDoctor, appointmentsDoctor)
router.post('/doctor/cancel', authDoctor, doctorCancel)
router.post('/doctor/complete', authDoctor, appointmentComplete)

router.get('/admin', authAdmin, appointmentsAdmin)
router.post('/admin/cancel', authAdmin, adminCancel)

export default router

import { Router } from 'express'

import authDoctor from '../../middlewares/authDoctor.js'

import authPatient from '../middleware/authPatient.js'

import authMiddleware from '../middleware/authMiddleware.js'

import patientReportUpload from '../../middlewares/patientReportUpload.js'

import { validate, schemas } from '../middleware/validate.js'

import {

  forbidHistoryDelete,

  forbidHistoryModify,

  createHistory,

  addPrescriptions,

  getMyHistory,

  getPatientHistory,

  getHistoryByAppointment,

  uploadPatientReport,

  downloadPrescriptionPdf,

  downloadPatientAttachment,

  legacyListHistory,

} from '../controllers/historyController.js'



const router = Router()

const reportUpload = patientReportUpload.array('files', 5)



router.get('/my', authPatient, getMyHistory)

/** Documentation alias — same as GET /my */
router.get('/', authPatient, getMyHistory)

router.post(

  '/my/reports',

  authPatient,

  reportUpload,

  validate(schemas.uploadPatientReport),

  uploadPatientReport

)

router.get('/patient/:patientId', authDoctor, getPatientHistory)

router.get('/appointment/:appointmentId', authDoctor, getHistoryByAppointment)

router.get(
  '/:historyId/attachments/:index/download',
  authMiddleware,
  downloadPatientAttachment
)
router.get('/:historyId/prescription.pdf', authMiddleware, downloadPrescriptionPdf)



router.delete('/:id', forbidHistoryDelete)

router.patch('/:id', forbidHistoryModify)

router.put('/:id', forbidHistoryModify)

router.post('/', authDoctor, createHistory)

router.post('/:historyId/prescriptions', authDoctor, addPrescriptions)



router.post('/list', authPatient, legacyListHistory)



export default router


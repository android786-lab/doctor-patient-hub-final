import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PATIENT_REPORTS_DIR = path.join(__dirname, '..', 'uploads', 'patient-reports')

fs.mkdirSync(PATIENT_REPORTS_DIR, { recursive: true })

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const MAX_BYTES = 10 * 1024 * 1024

function extForFile(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase()
  if (fromName && fromName.length <= 8) return fromName
  if (file.mimetype === 'application/pdf') return '.pdf'
  if (file.mimetype === 'image/png') return '.png'
  if (file.mimetype === 'image/webp') return '.webp'
  return '.jpg'
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, PATIENT_REPORTS_DIR)
  },
  filename(_req, file, cb) {
    const ext = extForFile(file)
    const base = path
      .basename(file.originalname || 'report', ext)
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(0, 80)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${base || 'report'}${ext}`)
  },
})

const patientReportUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 5 },
  fileFilter(_req, file, cb) {
    const mime = file.mimetype || ''
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (!ALLOWED_MIME.has(mime) && !['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Only PDF, JPG, PNG, or WEBP files are allowed (max 10MB each)'))
    }
    cb(null, true)
  },
})

export function localPatientReportUrl(file) {
  if (!file?.filename) return null
  return `/uploads/patient-reports/${file.filename}`
}

export default patientReportUpload

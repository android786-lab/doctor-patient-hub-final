import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PAYMENTS_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'payments')

if (process.env.VERCEL !== '1') {
  fs.mkdirSync(PAYMENTS_UPLOAD_DIR, { recursive: true })
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png'])
const MAX_BYTES = 5 * 1024 * 1024

const storage =
  process.env.VERCEL === '1'
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination(_req, _file, cb) {
          cb(null, PAYMENTS_UPLOAD_DIR)
        },
        filename(_req, file, cb) {
          const ext = file.mimetype === 'image/png' ? '.png' : '.jpg'
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`)
        },
      })

const paymentScreenshotUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPG and PNG images are allowed (max 5MB)'))
    }
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ext && !['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only .jpg and .png file extensions are allowed'))
    }
    cb(null, true)
  },
})

export default paymentScreenshotUpload

export function localPaymentProofUrl(file) {
  if (!file?.filename) return null
  return `/uploads/payments/${file.filename}`
}

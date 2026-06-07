import multer from 'multer'

/** In-memory uploads (payment screenshots) — works reliably on Windows. */
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

export default memoryUpload

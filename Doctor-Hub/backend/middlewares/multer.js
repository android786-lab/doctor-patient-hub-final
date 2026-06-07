import multer from 'multer'

const storage =
  process.env.VERCEL === '1'
    ? multer.memoryStorage()
    : multer.diskStorage({
        filename(_req, file, callback) {
          callback(null, file.originalname)
        },
      })

const upload = multer({ storage })

export default upload
import fs from 'fs'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'
import supabase from '../config/supabase.js'
import { localPaymentProofUrl } from '../../middlewares/paymentScreenshotUpload.js'

const PAYMENT_BUCKET = 'payment-proofs'
const MAX_INLINE_PROOF_BYTES = 900 * 1024

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    }),
  ])
}

export function isCloudinaryConfigured() {
  return Boolean(
    (process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME) &&
      process.env.CLOUDINARY_API_KEY &&
      (process.env.CLOUDINARY_SECRET_KEY || process.env.CLOUDINARY_API_SECRET)
  )
}

export function configureCloudinary() {
  if (!isCloudinaryConfigured()) return false
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY || process.env.CLOUDINARY_API_SECRET,
    timeout: 60000,
  })
  return true
}

export function fileBuffer(file) {
  if (file?.buffer?.length) return file.buffer
  if (file?.path && fs.existsSync(file.path)) return fs.readFileSync(file.path)
  return null
}

/** Save proof in DB when Cloudinary / Supabase storage are slow or blocked. */
export function proofDataUrlFromFile(file) {
  const buffer = fileBuffer(file)
  if (!buffer) return null
  if (buffer.length > MAX_INLINE_PROOF_BYTES) {
    throw new Error('Screenshot is too large — use an image under 900 KB or take a smaller screenshot')
  }
  const mime = file.mimetype || 'image/jpeg'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function cloudinaryResourceType(file) {
  const mime = file?.mimetype || ''
  if (mime === 'application/pdf') return 'raw'
  return 'image'
}

function cloudinaryDeliveryUrl(result, file) {
  let url = result?.secure_url || null
  if (!url) return null
  const mime = file?.mimetype || ''
  const isPdf =
    mime === 'application/pdf' || /\.pdf$/i.test(file?.originalname || '')
  if (isPdf && !/\.pdf$/i.test(url.split('?')[0])) {
    url = `${url}.pdf`
  }
  return url
}

async function uploadToCloudinary(file, folder) {
  if (!configureCloudinary()) return null
  const resource_type = cloudinaryResourceType(file)
  const mime = file?.mimetype || ''
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(file?.originalname || '')
  const ext = path.extname(file?.originalname || '') || (isPdf ? '.pdf' : '.jpg')
  const uploadOpts = {
    resource_type,
    folder,
    timeout: 55000,
  }
  if (isPdf) {
    uploadOpts.public_id = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  }

  if (file.path && fs.existsSync(file.path)) {
    const result = await cloudinary.uploader.upload(file.path, uploadOpts)
    return cloudinaryDeliveryUrl(result, file)
  }

  const buffer = fileBuffer(file)
  if (!buffer) return null

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOpts, (err, result) => {
      if (err) reject(err)
      else resolve(cloudinaryDeliveryUrl(result, file))
    })
    stream.end(buffer)
  })
}

async function uploadToSupabaseStorage(file, folder) {
  const buffer = fileBuffer(file)
  if (!buffer) throw new Error('Could not read screenshot file')

  const ext = path.extname(file.originalname || '') || '.jpg'
  const safeExt = ext.length <= 8 ? ext : '.jpg'
  const objectPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`

  const { error } = await supabase.storage.from(PAYMENT_BUCKET).upload(objectPath, buffer, {
    contentType: file.mimetype || 'image/jpeg',
    upsert: false,
  })

  if (error) {
    if (/bucket|not found/i.test(error.message || '')) {
      throw new Error('Storage bucket missing — run supabase/014_payment_proofs_storage.sql')
    }
    throw error
  }

  const { data } = supabase.storage.from(PAYMENT_BUCKET).getPublicUrl(objectPath)
  return data.publicUrl
}

/** Payment screenshot: local disk → cloud → storage → inline base64 */
export async function uploadPaymentProof(file) {
  if (!file) throw new Error('Image file is required')

  const localPath = localPaymentProofUrl(file)
  if (localPath) {
    const base =
      process.env.API_PUBLIC_URL ||
      process.env.BACKEND_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 4000}`
    return `${String(base).replace(/\/$/, '')}${localPath}`
  }

  const folder = 'doctor-hub/payment-proofs'

  try {
    const url = await withTimeout(uploadToCloudinary(file, folder), 22000, 'Cloudinary')
    if (url) return url
  } catch (err) {
    console.warn('Cloudinary upload failed:', err.message)
  }

  try {
    const url = await withTimeout(uploadToSupabaseStorage(file, folder), 15000, 'Storage')
    if (url) return url
  } catch (err) {
    console.warn('Supabase storage upload failed:', err.message)
  }

  const dataUrl = proofDataUrlFromFile(file)
  console.warn('Payment proof saved inline (cloud upload unavailable)')
  return dataUrl
}

/** Images, PDFs — Cloudinary first, then Supabase storage. */
export async function uploadImageFile(file, { folder = 'doctor-hub' } = {}) {
  if (!file) throw new Error('File is required')

  try {
    const url = await withTimeout(uploadToCloudinary(file, folder), 30000, 'Cloudinary')
    if (url) return url
  } catch (err) {
    console.warn('Cloudinary upload failed, trying Supabase storage:', err.message)
  }

  return uploadToSupabaseStorage(file, folder)
}

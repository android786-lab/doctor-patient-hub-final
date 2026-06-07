import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v2 as cloudinary } from 'cloudinary'
import { configureCloudinary } from './imageUpload.js'
import { PATIENT_REPORTS_DIR } from '../../middlewares/patientReportUpload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '../..')

function uniqueUrls(list) {
  const seen = new Set()
  const out = []
  for (const u of list) {
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

function isValidFileBuffer(buf) {
  if (!buf?.length || buf.length < 32) return false
  if (buf.subarray(0, 4).toString('utf8') === '%PDF') return true
  if (buf[0] === 0xff && buf[1] === 0xd8) return true
  if (buf[0] === 0x89 && buf[1] === 0x50) return true
  const head = buf.subarray(0, 24).toString('utf8').toLowerCase()
  if (head.includes('<!doctype') || head.startsWith('<html')) return false
  return buf.length > 200
}

export function resolveLocalUploadPath(url) {
  if (!url) return null
  let rel = null
  if (url.startsWith('/uploads/')) {
    rel = url.replace(/^\//, '')
  } else {
    const idx = url.indexOf('/uploads/')
    if (idx !== -1) rel = url.slice(idx + 1)
  }
  if (!rel) return null
  const filePath = path.join(backendRoot, rel)
  return fs.existsSync(filePath) ? filePath : null
}

function readLocalPatientReportBasename(url) {
  const base = path.basename(String(url).split('?')[0])
  if (!base || base === '/') return null
  const filePath = path.join(PATIENT_REPORTS_DIR, base)
  return fs.existsSync(filePath) ? filePath : null
}

function parseCloudinaryFromUrl(url) {
  const m = String(url).match(/res\.cloudinary\.com\/[^/]+\/(image|raw)\/upload\/(?:v\d+\/)?([^?]+)/i)
  if (!m) return null
  return { resourceType: m[1], publicId: decodeURIComponent(m[2]) }
}

function buildFetchCandidates(url, att) {
  const candidates = [url]
  const name = att?.name || ''
  const type = att?.type || ''
  const isPdf =
    type === 'application/pdf' ||
    /\.pdf$/i.test(name) ||
    (type !== 'image/jpeg' &&
      type !== 'image/png' &&
      type !== 'image/webp' &&
      !type.startsWith('image/'))

  if (url.includes('cloudinary.com')) {
    const [base, query] = url.split('?')
    if (isPdf && /\/raw\//.test(url) && !/\.pdf$/i.test(base)) {
      candidates.push(`${base}.pdf${query ? `?${query}` : ''}`)
    }
    if (/\.pdf$/i.test(base)) {
      candidates.push(base.replace(/\.pdf$/i, '') + (query ? `?${query}` : ''))
    }
    candidates.push(url.replace('/upload/', '/upload/fl_attachment/'))
  }

  return uniqueUrls(candidates)
}

async function bufferFromCloudinaryApi(url) {
  if (!configureCloudinary()) return null
  const parsed = parseCloudinaryFromUrl(url)
  if (!parsed) return null

  const publicIds = uniqueUrls([
    parsed.publicId,
    parsed.publicId.endsWith('.pdf') ? parsed.publicId.replace(/\.pdf$/i, '') : `${parsed.publicId}.pdf`,
  ])

  for (const publicId of publicIds) {
    try {
      const info = await cloudinary.api.resource(publicId, {
        resource_type: parsed.resourceType,
      })
      const delivery = info?.secure_url
      if (!delivery) continue
      const res = await fetch(delivery)
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (isValidFileBuffer(buf)) return buf
    } catch {
      try {
        const signed = cloudinary.url(publicId, {
          resource_type: parsed.resourceType,
          secure: true,
          sign_url: Boolean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET_KEY),
        })
        const res = await fetch(signed)
        if (!res.ok) continue
        const buf = Buffer.from(await res.arrayBuffer())
        if (isValidFileBuffer(buf)) return buf
      } catch {
        /* try next public_id */
      }
    }
  }
  return null
}

/** Load attachment bytes from disk, HTTP, or Cloudinary API. */
export async function fetchAttachmentBuffer(url, att = {}) {
  const localPath =
    resolveLocalUploadPath(url) || readLocalPatientReportBasename(url)
  if (localPath) return fs.readFileSync(localPath)

  for (const candidate of buildFetchCandidates(url, att)) {
    try {
      const res = await fetch(candidate, { redirect: 'follow' })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (isValidFileBuffer(buf)) return buf
    } catch {
      /* next candidate */
    }
  }

  return bufferFromCloudinaryApi(url)
}

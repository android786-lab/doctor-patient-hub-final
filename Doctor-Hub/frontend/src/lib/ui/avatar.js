/** Legacy CareLink 240×240 transparent placeholder — never show to patients */
const CARELINK_PLACEHOLDER_PREFIX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemS'

/** List / compact views: professional initials (hospital directory style) */
const INITIALS_ONLY_VARIANTS = new Set(['card', 'thumb', 'appointment'])

export function isUsablePhoto(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false
  if (trimmed.startsWith(CARELINK_PLACEHOLDER_PREFIX)) return false
  if (trimmed.startsWith('data:image')) return false
  if (/ui-avatars\.com\/api\/\?name=Doctor(?:&|$)/i.test(trimmed)) return false
  return /^https?:\/\//i.test(trimmed)
}

export function formatDoctorAvatarName(name) {
  const cleaned = String(name || 'Doctor')
    .replace(/^dr\.?\s*/i, '')
    .trim()
  if (!cleaned) return 'DR'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase()
}

export function getDoctorInitialsUrl(name, size = 512) {
  const initials = formatDoctorAvatarName(name)
  const params = new URLSearchParams({
    name: initials,
    background: '0f766e',
    color: 'ffffff',
    size: String(size),
    bold: 'true',
    length: '2',
    format: 'png',
  })
  return `https://ui-avatars.com/api/?${params.toString()}`
}

export function getDoctorPhotoUrl(name, image, { variant, size = 512 } = {}) {
  const preferInitials = variant && INITIALS_ONLY_VARIANTS.has(variant)
  if (!preferInitials && isUsablePhoto(image)) return image.trim()
  return getDoctorInitialsUrl(name, size)
}

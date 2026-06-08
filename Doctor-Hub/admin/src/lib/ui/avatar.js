const CARELINK_PLACEHOLDER_PREFIX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemS'

export function isUsablePhoto(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false
  if (trimmed.startsWith(CARELINK_PLACEHOLDER_PREFIX)) return false
  if (trimmed.startsWith('data:') && trimmed.length < 250) return false
  return true
}

export function getDoctorPhotoUrl(name, image) {
  if (isUsablePhoto(image)) return image.trim()
  const n = (name || 'Doctor').trim() || 'Doctor'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0d9488&color=fff&size=256&bold=true`
}

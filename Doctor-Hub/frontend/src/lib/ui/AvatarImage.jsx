import { getDoctorPhotoUrl } from './avatar.js'

const SIZES = {
  xs: 'dh-avatar--xs',
  sm: 'dh-avatar--sm',
  md: 'dh-avatar--md',
  lg: 'dh-avatar--lg',
  xl: 'dh-avatar--xl',
}

/** Round avatar for patients, staff, navbar */
export default function AvatarImage({ src, name, alt, size = 'md', className = '' }) {
  const url = getDoctorPhotoUrl(name, src)
  return (
    <img
      src={url}
      alt={alt || name || 'User'}
      className={`dh-avatar ${SIZES[size] || SIZES.md} ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  )
}

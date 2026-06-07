import { getDoctorPhotoUrl } from './avatar.js'

const PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="#99f6e4"><rect width="400" height="300" fill="#f0fdfa"/><circle cx="200" cy="110" r="48" fill="#5eead4"/><path d="M80 280c20-50 60-76 120-76s100 26 120 76" fill="#14b8a6"/></svg>`
  )

/**
 * Fixed-size doctor photos project-wide.
 * variant: card (list/grid), profile (detail), book (booking), thumb (compact), appointment (my appointments list)
 */
export default function DoctorPhoto({
  src,
  name,
  alt,
  variant = 'card',
  className = '',
  children,
}) {
  const url = getDoctorPhotoUrl(name, src) || PLACEHOLDER_SVG
  const label = alt || name || 'Doctor'

  return (
    <div className={`dh-doctor-photo dh-doctor-photo--${variant} ${className}`.trim()}>
      <img
        src={url}
        alt={label}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = PLACEHOLDER_SVG
        }}
      />
      {children}
    </div>
  )
}

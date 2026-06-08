import { getDoctorInitialsUrl, getDoctorPhotoUrl } from './avatar.js'

/**
 * Fixed-size doctor photos project-wide.
 * variant: card (list/grid), profile (detail), book (booking), thumb (compact), appointment (my appointments list)
 *
 * card / thumb / appointment → clean teal initials (hospital directory).
 * profile / book / sidebar → uploaded headshot when available.
 */
export default function DoctorPhoto({
  src,
  name,
  alt,
  variant = 'card',
  className = '',
  children,
}) {
  const url = getDoctorPhotoUrl(name, src, { variant })
  const fallbackUrl = getDoctorInitialsUrl(name)
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
          e.currentTarget.src = fallbackUrl
        }}
      />
      {children}
    </div>
  )
}

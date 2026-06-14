import { getDoctorPhotoUrl } from './avatar.js'

const PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="#99f6e4"><rect width="200" height="200" fill="#f0fdfa"/><circle cx="100" cy="72" r="36" fill="#5eead4"/><path d="M40 180c16-40 48-60 60-60s44 20 60 60" fill="#14b8a6"/></svg>`
  )

/** Tailwind sizing per variant — do not rely on external CSS for dimensions. */
const SHELL = {
  'card-portrait':
    'relative h-20 w-20 flex-none shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-slate-100 sm:h-[5.5rem] sm:w-[5.5rem]',
  'card-inline':
    'relative h-16 w-16 flex-none shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-teal-50 to-slate-100',
  card: 'relative aspect-[5/3] w-full max-h-44 overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-slate-100 sm:max-h-48',
  book: 'relative mx-auto h-56 w-full max-w-xs overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-slate-100 sm:h-60',
  profile:
    'relative mx-auto h-32 w-32 max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-slate-100 sm:h-36 sm:w-36',
  sidebar: 'relative h-44 w-full overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-slate-100',
  thumb: 'relative h-36 w-36 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-slate-100',
  appointment:
    'relative h-11 w-11 max-h-11 max-w-11 shrink-0 overflow-hidden rounded-full bg-teal-100 ring-1 ring-teal-100',
}

const IMG = {
  'card-portrait':
    'absolute inset-0 block h-full w-full max-h-full max-w-full object-cover object-center',
  'card-inline':
    'absolute inset-0 block h-full w-full max-h-full max-w-full object-cover object-center',
  appointment:
    'absolute inset-0 block h-full w-full max-h-full max-w-full object-cover object-center',
  default: 'block h-full w-full max-h-full max-w-full object-cover object-center',
}

/**
 * Fixed-size doctor photos project-wide.
 * variant: card-portrait (list card), card (banner), profile, book, thumb, appointment
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
  const shell = SHELL[variant] || SHELL.card
  const imgClass = IMG[variant] || IMG.default

  return (
    <div className={`${shell} ${className}`.trim()}>
      <img
        src={url}
        alt={label}
        loading="lazy"
        decoding="async"
        className={imgClass}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = PLACEHOLDER_SVG
        }}
      />
      {children}
    </div>
  )
}

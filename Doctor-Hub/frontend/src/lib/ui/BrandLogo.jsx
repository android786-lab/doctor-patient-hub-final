/**
 * Shared logo — no react-router import (avoids duplicate React / useRef crash in monorepo).
 * Pass `href` for a link, or use inside your app's <Link>.
 */
export default function BrandLogo({
  className = '',
  subtitle,
  light = false,
  link = true,
  href = '/',
  size = 'md',
}) {
  const iconBox =
    size === 'sm'
      ? 'flex h-9 w-9 items-center justify-center rounded-lg'
      : 'flex h-10 w-10 items-center justify-center rounded-xl shadow-md'
  const iconSvg = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const titleClass =
    size === 'sm'
      ? `font-display text-xl font-semibold ${light ? 'text-white' : 'text-teal-900'}`
      : `font-display text-lg font-semibold leading-tight ${light ? 'text-white' : 'text-slate-900'}`

  const inner = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${iconBox} bg-gradient-to-br from-teal-600 to-teal-800 text-white`}
      >
        <svg viewBox="0 0 24 24" className={iconSvg} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4v16M8 8h8M6 20h12" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <span className={titleClass}>Doctor Hub</span>
        {subtitle && (
          <p className={`text-xs font-medium ${light ? 'text-teal-200' : 'text-teal-700'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )

  if (link) {
    return (
      <a href={href} className="no-underline">
        {inner}
      </a>
    )
  }
  return inner
}

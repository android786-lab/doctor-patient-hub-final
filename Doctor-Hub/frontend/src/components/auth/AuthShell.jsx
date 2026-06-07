import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'

const features = [
  'Book appointments like a hospital portal',
  'Secure payments & verified specialists',
  'Protected medical records & prescriptions',
  'AI symptom guidance before your visit',
]

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex w-full min-h-[min(80vh,720px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 p-10 text-white lg:flex">
        <div>
          <BrandLogo light />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Patient portal
          </p>
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-4 text-teal-100/90">{subtitle}</p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-teal-50/90">
                <span className="mt-0.5 text-emerald-300">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-teal-200/80">Doctor Hub Medical Center — secure healthcare platform</p>
      </div>
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-10 md:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function AuthLinks() {
  return (
    <p className="mt-6 text-center text-xs text-slate-400">
      Hospital staff?{' '}
      <a
        href={import.meta.env.VITE_ADMIN_URL}
        className="font-medium text-teal-700 hover:underline"
      >
        Staff portal
      </a>
    </p>
  )
}

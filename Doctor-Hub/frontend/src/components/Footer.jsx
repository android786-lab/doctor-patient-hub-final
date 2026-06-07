import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import TrustBar from '@doctor-hub/ui/TrustBar.jsx'

const platform = [
  { to: '/doctors', label: 'Find doctors' },
  { to: '/ai-symptom', label: 'AI symptom check' },
  { to: '/my-appointments', label: 'My appointments' },
  { to: '/about', label: 'About hospital' },
]

const legal = [
  { to: '/contact', label: 'Help desk' },
  { to: '/login', label: 'Patient login' },
]

export default function Footer() {
  const adminUrl = import.meta.env.VITE_ADMIN_URL

  return (
    <footer className="mt-auto border-t border-slate-200 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300">
      <div className="dh-container-wide py-12 md:py-16">
        <div className="mb-8">
          <TrustBar
            className="border-slate-700 bg-slate-800/50 text-slate-200 [&_.dh-trust-pill]:border-slate-600 [&_.dh-trust-pill]:bg-slate-800 [&_.dh-trust-pill]:text-slate-200"
            items={[
              { icon: '🏥', label: 'Licensed care' },
              { icon: '🔐', label: 'HIPAA-style privacy' },
              { icon: '📋', label: 'Digital records' },
              { icon: '💬', label: 'Doctor chat' },
            ]}
          />
        </div>

        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrandLogo link={false} light />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Doctor Hub Medical Center — your trusted hospital portal for appointments, specialist
              care, secure payments, and protected medical history.
            </p>
            {adminUrl && (
              <a
                href={adminUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex text-sm font-medium text-teal-400 hover:text-teal-300"
              >
                Staff portal →
              </a>
            )}
          </div>

          <div className="md:col-span-3">
            <p className="dh-section-eyebrow text-teal-400">Services</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {platform.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition hover:text-teal-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="dh-section-eyebrow text-teal-400">Hospital desk</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>+92 306 7571707</li>
              <li>
                <a href="mailto:hamzaweb3565@gmail.com" className="hover:text-teal-400">
                  hamzaweb3565@gmail.com
                </a>
              </li>
              <li>Vehari, Punjab, Pakistan</li>
              <li className="text-teal-400/90">Mon – Sat · 9 AM – 6 PM</li>
            </ul>
            <ul className="mt-6 flex flex-wrap gap-4 text-sm">
              {legal.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-slate-500 hover:text-teal-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Doctor Hub Medical Center. All rights reserved.</p>
          <p className="max-w-xs sm:max-w-none">FA23-BSE-081 — Healthcare consultation system</p>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'

const treatments = [
  {
    id: 'allopathic',
    label: 'Allopathic',
    desc: 'Modern medicine & diagnostics',
    icon: '⚕',
    to: '/doctors?treatment=allopathic',
  },
  {
    id: 'homeopathic',
    label: 'Homeopathic',
    desc: 'Natural & holistic remedies',
    icon: '🌿',
    to: '/doctors?treatment=homeopathic',
  },
  {
    id: 'herbal',
    label: 'Herbal',
    desc: 'Plant-based traditional care',
    icon: '🍃',
    to: '/doctors?treatment=herbal',
  },
]

export default function HeroSection() {
  return (
    <section className="dh-hero--clinical relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.15),transparent_50%)]" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Doctor Hub Medical Center
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Book your hospital appointment online
          </h1>
          <p className="mt-4 text-base leading-relaxed text-teal-50/90 md:text-lg">
            Find verified specialists, choose your slot, pay securely, and track your visit — just
            like a modern private hospital portal.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap">
            <Link
              to="/doctors"
              className="rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-teal-900 shadow-lg transition hover:bg-teal-50"
            >
              Book appointment
            </Link>
            <Link
              to="/ai-symptom"
              className="rounded-xl border-2 border-white/40 px-6 py-3 text-center text-sm font-semibold transition hover:bg-white/10"
            >
              AI symptom check
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Departments', value: '3+' },
            { label: 'Online booking', value: '24/7' },
            { label: 'Secure payment', value: 'Stripe' },
            { label: 'Medical records', value: 'Protected' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-wider text-teal-100">{s.label}</p>
              <p className="mt-1 font-display text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { treatments }

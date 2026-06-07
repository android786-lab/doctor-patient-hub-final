import { Link } from 'react-router-dom'

const values = [
  {
    icon: '🔒',
    title: 'Secure records',
    desc: 'Medical history is append-only — doctors add entries; patients cannot delete prescriptions.',
  },
  {
    icon: '📅',
    title: 'Smart booking',
    desc: 'Live slot availability with payments and assistant verification before confirmation.',
  },
  {
    icon: '🌿',
    title: 'Multi-system care',
    desc: 'Filter specialists by allopathic, homeopathic, or herbal treatment types and diseases.',
  },
  {
    icon: '🤖',
    title: 'AI-assisted triage',
    desc: 'Symptom checker guides patients toward the right specialty with rule-based fallback.',
  },
]

const stats = [
  { label: 'Treatment systems', value: '3+' },
  { label: 'Booking & payments', value: 'Integrated' },
  { label: 'Staff roles', value: '5' },
  { label: 'Patient portal', value: '24/7' },
]

const teamRoles = [
  { role: 'Patients', desc: 'Book visits, upload reports, chat with doctors' },
  { role: 'Doctors', desc: 'Schedules, e-prescriptions, medical history' },
  { role: 'Assistants', desc: 'Verify payments and manage appointments' },
  { role: 'Admins', desc: 'Analytics, doctor verification, platform control' },
]

export default function About() {
  return (
    <div className="pb-16">
      <div className="dh-hero">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-widest text-teal-200">About Doctor Hub</p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Healthcare consultation, built for trust
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-teal-100/90 md:text-base">
            A production-style platform connecting patients, doctors, assistants, and administrators
            — designed for real workflows and academic evaluation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/doctors" className="dh-btn bg-white text-teal-900 hover:bg-teal-50">
              Browse doctors
            </Link>
            <Link
              to="/ai-symptom"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Try AI symptom check
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="dh-card p-6 text-center">
            <p className="font-display text-3xl font-bold text-teal-700">{s.value}</p>
            <p className="mt-2 text-sm font-medium text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-slate-900">What we offer</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          End-to-end tools for booking, clinical records, and staff operations.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="dh-card group p-6 transition hover:border-teal-200 hover:shadow-xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-xl transition group-hover:bg-teal-100">
                {v.icon}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div className="dh-card p-8 md:p-10">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Our vision</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            We bridge patients and providers with disease-based search, digital payments,
            e-prescriptions, AI-assisted triage, and role-based staff tools. Doctor Hub is your
            healthcare system — modern UX, secure data, and a backend you can extend with video
            consults, WhatsApp, and PDF prescriptions.
          </p>
        </div>
        <div className="dh-card border-teal-100 bg-gradient-to-br from-teal-50/50 to-white p-8 md:p-10">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Who uses the platform</h2>
          <ul className="mt-6 space-y-4">
            {teamRoles.map((t) => (
              <li key={t.role} className="flex gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                  {t.role[0]}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{t.role}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{t.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

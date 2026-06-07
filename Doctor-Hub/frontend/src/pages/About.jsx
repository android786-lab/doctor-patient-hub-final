import { Link } from 'react-router-dom'
import SectionHead from '@doctor-hub/ui/SectionHead.jsx'
import StatPanel from '@doctor-hub/ui/StatPanel.jsx'
import TrustBar from '@doctor-hub/ui/TrustBar.jsx'

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
      <div className="dh-hero--clinical">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">About us</p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Doctor Hub Medical Center
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-teal-100/90 md:text-base">
            A modern hospital portal connecting patients, specialists, and staff — with secure booking,
            digital records, and verified clinical workflows.
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

      <TrustBar className="mt-8" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatPanel key={s.label} label={s.label} value={s.value} tone="teal" />
        ))}
      </div>

      <section className="mt-14">
        <SectionHead
          eyebrow="Our services"
          title="What we offer"
          description="End-to-end hospital tools for patients and clinical staff."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="dh-dept-card"
            >
              <span className="dh-dept-card__icon text-lg">{v.icon}</span>
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

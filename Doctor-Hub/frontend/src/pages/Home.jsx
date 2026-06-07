import HeroSection, { treatments } from '../components/home/HeroSection'
import WorkflowSteps from '../components/home/WorkflowSteps'
import TopDoctors from '../components/TopDoctors'
import TrustBar from '@doctor-hub/ui/TrustBar.jsx'
import SectionHead from '@doctor-hub/ui/SectionHead.jsx'
import StatPanel from '@doctor-hub/ui/StatPanel.jsx'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="space-y-12 pb-20 md:space-y-16">
      <HeroSection />

      <TrustBar />

      <section>
        <SectionHead
          eyebrow="Departments"
          title="Choose your treatment system"
          description="Browse hospital specialists by department — allopathic, homeopathic, or herbal care."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {treatments.map((t) => (
            <Link key={t.id} to={t.to} className="group dh-dept-card block no-underline">
              <div className="dh-dept-card__icon text-lg">{t.icon}</div>
              <p className="mt-4 font-semibold text-slate-900 group-hover:text-teal-800">{t.label}</p>
              <p className="mt-1 text-sm text-slate-600">{t.desc}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-teal-700">View doctors →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel label="Patient portal" value="24/7" hint="Book & track anytime" tone="teal" />
        <StatPanel label="Specialists" value="Verified" hint="Licensed doctors only" tone="blue" />
        <StatPanel label="Payments" value="Secure" hint="Stripe & manual proof" tone="slate" />
        <StatPanel label="Records" value="Protected" hint="Immutable medical history" tone="teal" />
      </section>

      <WorkflowSteps />

      <section>
        <SectionHead
          eyebrow="Our specialists"
          title="Featured doctors — available now"
          description="Book a consultation with top-rated hospital specialists in one click."
          action={
            <Link to="/doctors" className="dh-btn-outline text-sm">
              Full directory
            </Link>
          }
        />
        <div className="mt-8">
          <TopDoctors />
        </div>
      </section>

      <section className="dh-portal-panel overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="bg-gradient-to-br from-teal-700 to-teal-900 p-8 text-white md:p-10">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Need help?</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Visit our help desk</h3>
            <p className="mt-3 text-sm text-teal-100">
              Questions about appointments, payments, or your medical records? Our team responds within
              24 hours.
            </p>
            <Link to="/contact" className="mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900">
              Contact hospital desk
            </Link>
          </div>
          <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Hours:</span> Mon – Sat · 9:00 AM – 6:00 PM
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Location:</span> Vehari, Punjab, Pakistan
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Emergency line:</span> +92 302 3465721
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

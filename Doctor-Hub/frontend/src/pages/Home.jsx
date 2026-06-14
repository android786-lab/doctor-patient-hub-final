import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import HeroSection, { treatments } from '../components/home/HeroSection'
import WorkflowSteps from '../components/home/WorkflowSteps'
import TopDoctors from '../components/TopDoctors'
import TrustBar from '@doctor-hub/ui/TrustBar.jsx'
import SectionHead from '@doctor-hub/ui/SectionHead.jsx'
import { FadeUp, StaggerContainer, StaggerItem, CountUp } from '../components/animations'

function AnimatedDeptCard({ treatment: t }) {
  const reduceMotion = useReducedMotion()

  const card = (
    <Link to={t.to} className="group dh-dept-card block no-underline">
      <div className="dh-dept-card__icon text-lg transition-transform duration-300 group-hover:scale-110">
        {t.icon}
      </div>
      <p className="mt-4 font-semibold text-slate-900 group-hover:text-teal-800">{t.label}</p>
      <p className="mt-1 text-sm text-slate-600">{t.desc}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-teal-700">View doctors →</span>
    </Link>
  )

  if (reduceMotion) return card

  return (
    <motion.div
      whileHover={{
        y: -6,
        scale: 1.02,
        boxShadow: '0 16px 32px rgba(15, 118, 110, 0.12)',
      }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      {card}
    </motion.div>
  )
}

function AnimatedStatPanel({ label, value, hint, tone }) {
  const tones = {
    teal: 'from-teal-600 to-teal-800',
    blue: 'from-sky-600 to-sky-800',
    slate: 'from-slate-600 to-slate-800',
  }

  return (
    <div className="dh-stat-panel transition-shadow duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 inline-flex h-1 w-10 rounded-full bg-gradient-to-r ${tones[tone] || tones.teal}`} />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900">
        <CountUp value={value} />
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function Home() {
  return (
    <div className="space-y-12 pb-20 md:space-y-16">
      <HeroSection />

      <FadeUp delay={0.05}>
        <TrustBar />
      </FadeUp>

      <FadeUp as="section">
        <SectionHead
          eyebrow="Departments"
          title="Choose your treatment system"
          description="Browse hospital specialists by department — allopathic, homeopathic, or herbal care."
        />
        <StaggerContainer className="mt-6 grid gap-4 sm:grid-cols-3" stagger={0.1}>
          {treatments.map((t) => (
            <StaggerItem key={t.id}>
              <AnimatedDeptCard treatment={t} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </FadeUp>

      <FadeUp as="section">
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.12}>
          <StaggerItem>
            <AnimatedStatPanel label="Active doctors" value="50+" hint="Verified specialists" tone="teal" />
          </StaggerItem>
          <StaggerItem>
            <AnimatedStatPanel label="Patients served" value="1200+" hint="Trusted hospital care" tone="blue" />
          </StaggerItem>
          <StaggerItem>
            <AnimatedStatPanel label="Online booking" value="24/7" hint="Book & track anytime" tone="slate" />
          </StaggerItem>
          <StaggerItem>
            <AnimatedStatPanel label="Secure records" value="100%" hint="Protected medical history" tone="teal" />
          </StaggerItem>
        </StaggerContainer>
      </FadeUp>

      <WorkflowSteps />

      <FadeUp as="section">
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
          <TopDoctors animated />
        </div>
      </FadeUp>

      <FadeUp as="section" className="dh-portal-panel overflow-hidden">
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
      </FadeUp>
    </div>
  )
}

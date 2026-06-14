import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT } from '../animations/motionPresets.js'
import { StaggerContainerOnLoad, loadStaggerItem } from '../animations/StaggerContainer.jsx'

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

const HEADLINE = 'Book your hospital appointment online'

function WordByWordHeadline() {
  const reduceMotion = useReducedMotion()
  const words = HEADLINE.split(' ')

  if (reduceMotion) {
    return (
      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
        {HEADLINE}
      </h1>
    )
  }

  return (
    <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="mr-[0.28em] inline-block"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: 0.15 + i * 0.07,
            ease: EASE_OUT,
          }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  )
}

function HeroCta({ to, children, primary = false, delay = 0 }) {
  const reduceMotion = useReducedMotion()

  const className = primary
    ? 'rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-teal-900 shadow-lg transition hover:bg-teal-50'
    : 'rounded-xl border-2 border-white/40 px-6 py-3 text-center text-sm font-semibold transition hover:bg-white/10'

  if (reduceMotion) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 22,
        delay,
      }}
      whileHover={{ scale: 1.03, boxShadow: primary ? '0 12px 28px rgba(0,0,0,0.12)' : undefined }}
      whileTap={{ scale: 0.97 }}
    >
      <Link to={to} className={`block ${className}`}>
        {children}
      </Link>
    </motion.div>
  )
}

function FloatingStatsPanel({ children }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -8, 0],
      }}
      transition={{
        opacity: { duration: 0.7, delay: 0.35, ease: EASE_OUT },
        scale: { duration: 0.7, delay: 0.35, ease: EASE_OUT },
        y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 },
      }}
    >
      {children}
    </motion.div>
  )
}

export default function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="dh-hero--clinical relative overflow-hidden">
      {/* Animated calm gradient background */}
      {!reduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-90"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(15,118,110,0.95) 0%, rgba(13,148,136,0.88) 45%, rgba(224,242,254,0.15) 100%)',
              'linear-gradient(135deg, rgba(14,116,144,0.92) 0%, rgba(20,184,166,0.85) 50%, rgba(240,249,255,0.2) 100%)',
              'linear-gradient(135deg, rgba(15,118,110,0.95) 0%, rgba(13,148,136,0.88) 45%, rgba(224,242,254,0.15) 100%)',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.15),transparent_50%)]" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-100 backdrop-blur"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Doctor Hub Medical Center
          </motion.div>

          <WordByWordHeadline />

          <motion.p
            className="mt-4 text-base leading-relaxed text-teal-50/90 md:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55, ease: EASE_OUT }}
          >
            Find verified specialists, choose your slot, pay securely, and track your visit — just
            like a modern private hospital portal.
          </motion.p>

          <StaggerContainerOnLoad className="mt-8 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap" stagger={0.08} delay={0.65}>
            <motion.div variants={loadStaggerItem}>
              <HeroCta to="/doctors" primary delay={0.7}>
                Book appointment
              </HeroCta>
            </motion.div>
            <motion.div variants={loadStaggerItem}>
              <HeroCta to="/ai-symptom" delay={0.78}>
                AI symptom check
              </HeroCta>
            </motion.div>
          </StaggerContainerOnLoad>
        </div>

        <FloatingStatsPanel>
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
        </FloatingStatsPanel>
      </div>
    </section>
  )
}

export { treatments }

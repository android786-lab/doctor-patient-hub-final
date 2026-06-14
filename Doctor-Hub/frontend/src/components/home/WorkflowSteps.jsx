import SectionHead from '@doctor-hub/ui/SectionHead.jsx'
import { motion, useReducedMotion } from 'framer-motion'
import { FadeUp, StaggerContainer, StaggerItem } from '../animations'

const steps = [
  {
    n: '1',
    title: 'Find a specialist',
    desc: 'Search by disease, department, or treatment type — like the hospital directory.',
  },
  {
    n: '2',
    title: 'Select date & time',
    desc: 'Pick an available slot from the doctor’s live schedule.',
  },
  {
    n: '3',
    title: 'Pay securely',
    desc: 'Complete payment online — your receipt is saved to your patient file.',
  },
  {
    n: '4',
    title: 'Visit confirmed',
    desc: 'Hospital staff verifies payment and confirms your appointment.',
  },
]

function StepCard({ step: s }) {
  const reduceMotion = useReducedMotion()

  const card = (
    <div className="dh-step-card h-full">
      <span className="dh-step-number">{s.n}</span>
      <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
    </div>
  )

  if (reduceMotion) return card

  return (
    <motion.div
      className="h-full"
      whileHover={{
        y: -5,
        scale: 1.02,
        boxShadow: '0 14px 28px rgba(15, 118, 110, 0.1)',
      }}
      transition={{ duration: 0.25 }}
    >
      {card}
    </motion.div>
  )
}

export default function WorkflowSteps() {
  return (
    <FadeUp as="section">
      <SectionHead
        eyebrow="Patient journey"
        title="How to book at Doctor Hub"
        description="A simple hospital-style flow from search to confirmed visit."
      />
      <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
        {steps.map((s) => (
          <StaggerItem key={s.n}>
            <StepCard step={s} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </FadeUp>
  )
}

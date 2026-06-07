import SectionHead from '@doctor-hub/ui/SectionHead.jsx'

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

export default function WorkflowSteps() {
  return (
    <section>
      <SectionHead
        eyebrow="Patient journey"
        title="How to book at Doctor Hub"
        description="A simple hospital-style flow from search to confirmed visit."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="dh-step-card">
            <span className="dh-step-number">{s.n}</span>
            <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

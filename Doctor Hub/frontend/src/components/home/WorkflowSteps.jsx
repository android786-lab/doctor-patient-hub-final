const steps = [
  { n: '1', title: 'Search doctor', desc: 'Filter by disease, treatment type, speciality' },
  { n: '2', title: 'Book slot', desc: 'Choose date & time — same flow as proven booking systems' },
  { n: '3', title: 'Pay with Stripe', desc: 'Secure online payment' },
  { n: '4', title: 'Assistant confirms', desc: 'Staff verifies payment → appointment confirmed' },
]

export default function WorkflowSteps() {
  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl font-semibold text-slate-900">
        How Doctor Hub works
      </h2>
      <p className="mt-2 text-slate-600">Documentation workflow — end to end</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="dh-card p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary-dark">
              {s.n}
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

import HeroSection from '../components/home/HeroSection'
import WorkflowSteps from '../components/home/WorkflowSteps'
import TopDoctors from '../components/TopDoctors'
import { Link } from 'react-router-dom'

const treatments = [
  { id: 'allopathic', label: 'Allopathic', desc: 'Modern medicine' },
  { id: 'homeopathic', label: 'Homeopathic', desc: 'Natural remedies' },
  { id: 'herbal', label: 'Herbal', desc: 'Plant-based care' },
]

export default function Home() {
  return (
    <div className="pb-20">
      <HeroSection />

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">Treatment types</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {treatments.map((t) => (
            <Link
              key={t.id}
              to={`/doctors?treatment=${t.id}`}
              className="dh-card p-5 transition hover:border-primary/30 hover:shadow-lift"
            >
              <p className="font-semibold text-primary-dark">{t.label}</p>
              <p className="mt-1 text-sm text-slate-600">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <WorkflowSteps />

      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              Featured
            </p>
            <h2 className="font-display text-2xl font-semibold text-slate-900">Top doctors</h2>
            <p className="mt-1 text-sm text-slate-600">Available now — book in one click</p>
          </div>
          <Link to="/doctors" className="text-sm font-medium text-teal-700 hover:underline">
            Browse directory →
          </Link>
        </div>
        <div className="mt-8">
          <TopDoctors />
        </div>
      </section>
    </div>
  )
}

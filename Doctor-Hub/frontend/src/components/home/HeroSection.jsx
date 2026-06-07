import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-teal-500 px-5 py-12 text-white sm:rounded-3xl sm:px-8 sm:py-16 md:px-12 md:py-20">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wider text-teal-100">
          Healthcare consultation platform
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          Find doctors by disease, book & pay securely
        </h1>
        <p className="mt-4 text-lg text-teal-50/90">
          Allopathic, homeopathic & herbal specialists — medical history,
          Stripe payments, assistant verification, AI symptom triage.
        </p>
        <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:gap-4">
          <Link to="/doctors" className="rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-primary-dark shadow-lg hover:bg-teal-50">
            Browse doctors
          </Link>
          <Link
            to="/ai-symptom"
            className="rounded-xl border-2 border-white/40 px-6 py-3 text-center text-sm font-semibold hover:bg-white/10"
          >
            AI symptom check
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function StatPanel({ label, value, hint, tone = 'teal' }) {
  const tones = {
    teal: 'from-teal-600 to-teal-800',
    blue: 'from-sky-600 to-sky-800',
    slate: 'from-slate-600 to-slate-800',
  }
  return (
    <div className="dh-stat-panel">
      <div className={`mb-3 inline-flex h-1 w-10 rounded-full bg-gradient-to-r ${tones[tone] || tones.teal}`} />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

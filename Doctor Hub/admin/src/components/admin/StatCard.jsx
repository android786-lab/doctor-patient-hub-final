import { Link } from 'react-router-dom'

const accents = {
  teal: 'from-teal-500 to-teal-700 shadow-teal-600/20',
  blue: 'from-sky-500 to-blue-700 shadow-sky-600/20',
  violet: 'from-violet-500 to-purple-700 shadow-violet-600/20',
}

export default function StatCard({ label, value, icon, accent = 'teal', to, hint }) {
  const inner = (
    <div className="dh-card group relative overflow-hidden p-6 transition hover:shadow-lg">
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent]} opacity-10 transition group-hover:scale-110`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
            {value ?? 0}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accents[accent]} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
      {to && (
        <p className="relative mt-4 text-xs font-semibold text-teal-700 group-hover:underline">
          View details →
        </p>
      )}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {inner}
      </Link>
    )
  }
  return inner
}

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#94a3b8']

export default function SimplePieChart({ data = [] }) {
  const total = data.reduce((s, d) => s + (Number(d.count) || 0), 0) || 1
  let cumulative = 0
  const slices = data.map((item, i) => {
    const value = Number(item.count) || 0
    const pct = (value / total) * 100
    const start = cumulative
    cumulative += pct
    return { ...item, pct, start, color: COLORS[i % COLORS.length] }
  })

  const gradient = slices
    .map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`)
    .join(', ')

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className="h-36 w-36 shrink-0 rounded-full shadow-inner ring-4 ring-white"
        style={{ background: total > 0 ? `conic-gradient(${gradient})` : '#e2e8f0' }}
        aria-hidden
      />
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.type} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="capitalize text-slate-700">{s.type}</span>
            <span className="font-semibold text-slate-900">
              {s.count} ({Math.round(s.pct)}%)
            </span>
          </li>
        ))}
        {total <= 1 && data.length === 0 && (
          <li className="text-slate-500">No doctor treatment data yet</li>
        )}
      </ul>
    </div>
  )
}

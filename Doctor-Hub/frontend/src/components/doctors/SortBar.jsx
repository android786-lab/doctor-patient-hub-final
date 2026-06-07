const options = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'fees-low', label: 'Fee ↑' },
  { value: 'fees-high', label: 'Fee ↓' },
  { value: 'available', label: 'Available' },
]

export default function SortBar({ value, onChange, resultCount, activeFilters }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {activeFilters > 0 && (
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            {activeFilters} filter{activeFilters > 1 ? 's' : ''}
          </span>
        )}
        {resultCount !== undefined && (
          <span className="text-sm text-slate-600">
            <strong className="text-slate-900">{resultCount}</strong> doctors
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Sort</span>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                value === opt.value
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

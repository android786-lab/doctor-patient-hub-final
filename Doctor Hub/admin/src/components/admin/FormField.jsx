export function FormField({ label, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export const selectClass = inputClass

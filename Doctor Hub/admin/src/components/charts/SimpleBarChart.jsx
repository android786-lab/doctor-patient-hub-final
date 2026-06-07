export default function SimpleBarChart({ data = [], labelKey = 'date', valueKey = 'count' }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0))

  return (
    <div className="flex h-48 items-end gap-2 border-b border-slate-200 pb-2">
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0
        const height = `${Math.round((value / max) * 100)}%`
        const label = String(item[labelKey] || '').slice(5)
        return (
          <div key={item[labelKey]} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-600">{value}</span>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[2.5rem] rounded-t-md bg-teal-500 transition-all"
                style={{ height }}
                title={`${item[labelKey]}: ${value}`}
              />
            </div>
            <span className="truncate text-[9px] text-slate-500">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

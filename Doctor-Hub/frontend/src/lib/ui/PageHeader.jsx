export default function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="mb-6 sm:mb-8">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{eyebrow}</p>
      )}
      <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl md:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
        {children ? <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">{children}</div> : null}
      </div>
    </div>
  )
}

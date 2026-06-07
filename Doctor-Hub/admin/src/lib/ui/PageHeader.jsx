export default function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{eyebrow}</p>
      )}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

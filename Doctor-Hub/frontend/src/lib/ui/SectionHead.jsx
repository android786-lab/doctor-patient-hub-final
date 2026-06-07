export default function SectionHead({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="dh-section-head min-w-0">
        {eyebrow ? <p className="dh-section-eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 font-display text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

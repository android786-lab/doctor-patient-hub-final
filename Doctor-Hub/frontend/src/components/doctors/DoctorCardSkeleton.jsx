export default function DoctorCardSkeleton() {
  return (
    <div className="dh-doctor-card animate-pulse">
      <div className="dh-doctor-card__inner">
        <div className="flex min-w-0 flex-1 flex-col space-y-3">
          <div className="space-y-2">
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-0.5 w-10 rounded bg-slate-200" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
          <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3">
            <div className="h-10 w-20 rounded bg-slate-200" />
            <div className="h-9 w-24 rounded-xl bg-slate-200" />
          </div>
        </div>
        <div className="h-[5.75rem] w-[5.75rem] shrink-0 rounded-xl bg-slate-200 sm:h-[6.25rem] sm:w-[6.25rem]" />
      </div>
    </div>
  )
}

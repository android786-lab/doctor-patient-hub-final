export default function DoctorCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex flex-row items-start gap-3">
        <div className="min-w-0 flex-1 animate-pulse space-y-3">
          <div className="h-5 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-3">
            <div className="h-8 w-16 rounded bg-slate-200" />
            <div className="h-8 w-20 rounded-xl bg-slate-200" />
          </div>
        </div>
        <div className="h-20 w-20 shrink-0 rounded-xl bg-slate-200 sm:h-[5.5rem] sm:w-[5.5rem]" />
      </div>
    </div>
  )
}

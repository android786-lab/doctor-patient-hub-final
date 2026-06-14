export default function DoctorCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 sm:gap-3 sm:p-3">
      <div className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl bg-slate-200 sm:h-[5rem] sm:w-[5rem]" />
      <div className="flex min-w-0 flex-1 flex-col space-y-2">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
        <div className="flex gap-1.5">
          <div className="h-4 w-14 rounded bg-slate-100" />
          <div className="h-4 w-12 rounded bg-slate-100" />
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="h-8 w-16 rounded bg-slate-200" />
          <div className="h-8 w-20 rounded-lg bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

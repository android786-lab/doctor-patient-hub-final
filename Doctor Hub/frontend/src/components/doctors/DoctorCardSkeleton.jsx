export default function DoctorCardSkeleton() {

  return (

    <div className="w-full animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">

      <div className="dh-doctor-photo dh-doctor-photo--card bg-slate-200" />

      <div className="space-y-3 p-4">

        <div className="h-5 w-3/4 rounded bg-slate-200" />

        <div className="h-4 w-1/2 rounded bg-slate-100" />

        <div className="h-3 w-full rounded bg-slate-100" />

        <div className="flex gap-2 pt-2">

          <div className="h-8 w-16 rounded bg-slate-100" />

          <div className="h-8 w-16 rounded bg-slate-100" />

        </div>

        <div className="flex justify-between border-t border-slate-100 pt-4">

          <div className="h-10 w-20 rounded bg-slate-200" />

          <div className="h-10 w-24 rounded-xl bg-slate-200" />

        </div>

      </div>

    </div>

  )

}



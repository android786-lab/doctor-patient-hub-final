export default function Loader() {
  return (
    <div className="flex items-center justify-center p-12" role="status" aria-label="Loading">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
    </div>
  )
}

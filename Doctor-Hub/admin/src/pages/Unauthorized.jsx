import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="font-display text-2xl font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 text-slate-600">You do not have permission to view this page.</p>
      <Link to="/" className="dh-btn mt-6">
        Back to login
      </Link>
    </div>
  )
}

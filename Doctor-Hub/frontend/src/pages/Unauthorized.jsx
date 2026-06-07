import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="dh-container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-3xl font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 max-w-md text-slate-600">
        You do not have permission to view this page.
      </p>
      <Link to="/auth/login" className="dh-btn mt-6 inline-block">
        Back to sign in
      </Link>
    </div>
  )
}

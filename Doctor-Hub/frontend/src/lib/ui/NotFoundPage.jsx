import { Link } from 'react-router-dom'

export default function NotFoundPage({ homeTo = '/', homeLabel = 'Go home' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-bold text-teal-600">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to={homeTo} className="dh-btn mt-8">
        {homeLabel}
      </Link>
    </div>
  )
}

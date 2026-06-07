import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex w-full min-h-[min(80vh,720px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:rounded-3xl">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-teal-800 via-teal-600 to-teal-500 p-10 text-white lg:flex">
        <BrandLogo light />
        <div>
          <h1 className="font-display text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-4 text-teal-50/90">{subtitle}</p>
        </div>
        <p className="text-sm text-teal-100">Doctor Hub — secure healthcare platform</p>
      </div>
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-10 md:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function AuthLinks() {
  return (
    <p className="mt-6 text-center text-xs text-slate-400">
      Clinic staff?{' '}
      <a
        href={import.meta.env.VITE_ADMIN_URL}
        className="font-medium text-teal-700 hover:underline"
      >
        Staff Portal
      </a>
    </p>
  )
}

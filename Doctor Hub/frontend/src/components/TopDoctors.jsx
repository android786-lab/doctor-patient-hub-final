import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import DoctorCard from './doctors/DoctorCard'

export default function TopDoctors() {
  const { doctors } = useContext(AppContext)
  const top = doctors.filter((d) => d.available).slice(0, 6)

  if (!top.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
        No doctors yet — add them from the staff portal.
      </p>
    )
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {top.map((doc) => (
          <DoctorCard key={doc.id} doctor={doc} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          to="/doctors"
          onClick={() => window.scrollTo(0, 0)}
          className="dh-btn-outline inline-flex"
        >
          View all doctors
        </Link>
      </div>
    </div>
  )
}

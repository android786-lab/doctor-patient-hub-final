import { useContext, useEffect } from 'react'
import { formatMoney } from '../../../../shared/constants/currency.js'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'

export default function DoctorsList() {
  const { doctors, aToken, getAllDoctors, changeAvailability } = useContext(AdminContext)

  useEffect(() => {
    if (aToken) getAllDoctors()
  }, [aToken])

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Directory"
        title="All doctors"
        description="Toggle availability — unavailable doctors won’t accept new bookings on the patient site."
      />

      {doctors.length === 0 ? (
        <div className="dh-card px-8 py-16 text-center">
          <p className="font-semibold text-slate-900">No doctors registered</p>
          <p className="mt-2 text-sm text-slate-500">Use Add Doctor to create the first profile.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {doctors.map((item) => (
            <article
              key={item.id}
              className="dh-card overflow-hidden transition hover:shadow-lg"
            >
              <DoctorPhoto src={item.image} name={item.name} variant="card">
                <span
                  className={`absolute right-3 top-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.available ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'
                  }`}
                >
                  {item.available ? 'Live' : 'Off'}
                </span>
              </DoctorPhoto>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900">{item.name}</h3>
                <p className="text-sm text-teal-700">{item.speciality}</p>
                <p className="mt-1 text-xs text-slate-500">{formatMoney(item.fees)} · {item.experience}</p>
                <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.available}
                    onChange={() => changeAvailability(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="font-medium text-slate-700">Available for booking</span>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

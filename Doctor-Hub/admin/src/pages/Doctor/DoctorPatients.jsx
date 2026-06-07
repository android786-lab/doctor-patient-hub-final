import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'
import AvatarImage from '@doctor-hub/ui/AvatarImage.jsx'

export default function DoctorPatients() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/doctor/patients`, {
          headers: { dtoken: dToken, token: dToken },
        })
        setPatients(data.patients || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (dToken) load()
  }, [dToken, backendUrl])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Your practice"
        title="Patients"
        description="Everyone who has booked an appointment with you."
      />

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="dh-card px-8 py-12 text-center text-sm text-slate-500">No patients yet.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {patients.map((p) => (
            <article key={p.user_id || p.patient_id} className="dh-card flex gap-4 p-4">
              <AvatarImage src={p.image} name={p.name} size="md" />
              <div>
                <p className="font-semibold text-slate-900">{p.name}</p>
                {p.email && <p className="text-xs text-slate-500">{p.email}</p>}
                <p className="mt-2 text-xs text-slate-600">
                  {p.visit_count} visit{p.visit_count === 1 ? '' : 's'}
                  {p.last_status && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase">
                      last: {String(p.last_status).replace(/_/g, ' ')}
                    </span>
                  )}
                </p>
                <Link
                  to={`/doctor/patients/${p.patient_id || p.user_id}/history`}
                  className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline"
                >
                  View history →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

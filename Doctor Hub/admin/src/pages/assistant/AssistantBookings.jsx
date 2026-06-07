import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { formatMoney } from '../../../../shared/constants/currency.js'

export default function AssistantBookings() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const headers = { atoken: aToken, token: aToken, dtoken: aToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/assistant/bookings`, {
          headers,
        })
        if (data.success) setList(data.bookings || [])
        else toast.error(data.message)
      } catch (e) {
        toast.error(e.message)
        setList([])
      } finally {
        setLoading(false)
      }
    }
    if (aToken) load()
  }, [aToken, backendUrl])

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Assistant"
        title="Bookings"
        description="All bookings with payment details for your doctor."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : list.length === 0 ? (
        <div className="dh-card px-8 py-12 text-center text-sm text-slate-500">No bookings yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((b) => (
            <article key={b.id} className="dh-card p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{b.patient_name}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                  {b.status || 'pending'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{b.appointment_date}</p>
              <p className="mt-2 text-sm font-semibold text-teal-700">{formatMoney(b.amount)}</p>
              {b.payment_method && (
                <p className="mt-1 text-xs text-slate-500">Method: {b.payment_method}</p>
              )}
              {b.payment_status && (
                <p className="mt-1 text-xs text-slate-500">Payment: {b.payment_status}</p>
              )}
              {b.screenshot_url && (
                <a
                  href={b.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline"
                >
                  View payment screenshot
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

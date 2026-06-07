import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { formatMoney } from '@doctor-hub/constants/currency.js'

export default function AdminPayments() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('')

  const headers = { atoken: aToken, token: aToken }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axiosClient.get(`${backendUrl}/api/admin/payments`, { headers })
        if (data.success) setPayments(data.payments || [])
        else toast.error(data.message)
      } catch (e) {
        toast.error(e.message)
        setPayments([])
      } finally {
        setLoading(false)
      }
    }
    if (aToken) load()
  }, [aToken, backendUrl])

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Administration"
        title="Payments"
        description="All payment records with proof screenshots."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Screenshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {p.appointment_id?.slice(0, 8) || p.id}…
                    <br />
                    <span className="text-slate-500">
                      {p.slot_date} {p.slot_time}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-teal-800">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.screenshot_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(p.screenshot_url)}
                        className="font-semibold text-teal-700 hover:underline"
                      >
                        View
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No payment records.</p>
          )}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewUrl('')}
          role="presentation"
        >
          <div className="max-h-[90vh] max-w-4xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Payment proof" className="max-h-[80vh] w-full object-contain" />
            <button type="button" className="dh-btn mt-4 w-full" onClick={() => setPreviewUrl('')}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import ClinicalDataList from '@doctor-hub/ui/ClinicalDataList.jsx'
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

  const columns = useMemo(
    () => [
      {
        key: 'appointment',
        label: 'Appointment',
        render: (p) => (
          <>
            <span className="font-mono text-xs text-slate-600">{p.appointment_id?.slice(0, 8) || p.id}…</span>
            <br />
            <span className="text-slate-500">
              {p.slot_date} {p.slot_time}
            </span>
          </>
        ),
      },
      {
        key: 'amount',
        label: 'Amount',
        render: (p) => <span className="font-semibold text-teal-800">{formatMoney(p.amount)}</span>,
      },
      { key: 'status', label: 'Status', render: (p) => <span className="capitalize">{p.status}</span> },
      {
        key: 'created_at',
        label: 'When',
        render: (p) => (p.created_at ? new Date(p.created_at).toLocaleString() : '—'),
      },
      {
        key: 'screenshot',
        label: 'Screenshot',
        render: (p) =>
          p.screenshot_url ? (
            <button
              type="button"
              onClick={() => setPreviewUrl(p.screenshot_url)}
              className="font-semibold text-teal-700 hover:underline"
            >
              View
            </button>
          ) : (
            '—'
          ),
      },
    ],
    []
  )

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      <PageHeader
        eyebrow="Administration"
        title="Payments"
        description="All payment records with proof screenshots."
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <ClinicalDataList
          columns={columns}
          rows={payments}
          emptyMessage="No payment records."
          mobileCard={(p) => (
            <article className="dh-portal-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-slate-600">{p.appointment_id?.slice(0, 8) || p.id}…</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {p.slot_date} {p.slot_time}
                  </p>
                </div>
                <span className="font-semibold text-teal-800">{formatMoney(p.amount)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                <span className="capitalize text-slate-700">{p.status}</span>
                {p.screenshot_url ? (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(p.screenshot_url)}
                    className="font-semibold text-teal-700 hover:underline"
                  >
                    View proof
                  </button>
                ) : null}
              </div>
            </article>
          )}
        />
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

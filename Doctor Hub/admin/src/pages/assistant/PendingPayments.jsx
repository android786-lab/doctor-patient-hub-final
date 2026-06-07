import { useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import ConfirmModal from '@doctor-hub/ui/ConfirmModal.jsx'
import { formatMoney } from '../../../../shared/constants/currency.js'
import Loader from '../../components/shared/Loader.jsx'

export default function PendingPayments() {
  const { aToken, backendUrl } = useContext(AdminContext)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [modal, setModal] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const headers = { atoken: aToken, token: aToken, dtoken: aToken }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/assistant/pending-payments`, {
        headers,
      })
      if (data.success) setList(data.payments || [])
      else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
      setList([])
    } finally {
      setLoading(false)
    }
  }, [aToken, backendUrl])

  useEffect(() => {
    if (aToken) load()
  }, [aToken, load])

  const runVerify = async (row) => {
    const id = row.payment_id || row.id
    setBusyId(id)
    try {
      const { data } = await axiosClient.put(
        `${backendUrl}/api/assistant/payments/${id}/verify`,
        {},
        { headers }
      )
      if (data.success) {
        toast.success(data.message || 'Payment verified')
        setModal(null)
        load()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const runReject = async (row, reason) => {
    const id = row.payment_id || row.id
    setBusyId(id)
    try {
      const { data } = await axiosClient.put(
        `${backendUrl}/api/assistant/payments/${id}/reject`,
        { reason },
        { headers }
      )
      if (data.success) {
        toast.success(data.message || 'Payment rejected')
        setModal(null)
        load()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-5 lg:p-7">
      <PageHeader
        eyebrow="Assistant"
        title="Pending payments"
        description="Review payment screenshots for your assigned doctor. Verify to confirm the appointment."
      >
        <button type="button" onClick={load} className="dh-btn py-2 text-sm">
          Refresh
        </button>
      </PageHeader>

      {loading ? (
        <Loader />
      ) : list.length === 0 ? (
        <div className="dh-card px-8 py-16 text-center text-sm text-slate-500">
          No payments awaiting verification.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Screenshot</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((row) => {
                const actionId = row.payment_id || row.id
                const busy = busyId === actionId
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.patient_name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.appointment_date}</td>
                    <td className="px-4 py-3 font-semibold text-teal-800">{formatMoney(row.amount)}</td>
                    <td className="px-4 py-3">
                      {row.screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(row.screenshot_url)}
                          className="text-teal-700 font-semibold hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setModal({
                              type: 'verify',
                              row,
                              title: 'Verify payment?',
                              message: `Confirm payment from ${row.patient_name} and mark the appointment as confirmed.`,
                            })
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setModal({
                              type: 'reject',
                              row,
                              title: 'Reject payment?',
                              message: `Reject this payment from ${row.patient_name}. The patient may need to upload a new screenshot.`,
                              reason: '',
                            })
                          }
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewUrl('')}
          role="presentation"
        >
          <div
            className="max-h-[90vh] max-w-4xl overflow-auto rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewUrl} alt="Payment screenshot" className="max-h-[80vh] w-full object-contain" />
            <button
              type="button"
              className="dh-btn mt-4 w-full"
              onClick={() => setPreviewUrl('')}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modal?.type === 'verify'}
        title={modal?.title}
        message={modal?.message}
        confirmLabel="Verify payment"
        tone="success"
        busy={!!busyId}
        onCancel={() => setModal(null)}
        onConfirm={() => modal?.row && runVerify(modal.row)}
      />

      {modal?.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
            <textarea
              className="dh-input mt-4 min-h-[80px]"
              placeholder="Reason (optional)"
              value={modal.reason || ''}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={!!busyId}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => modal.row && runReject(modal.row, modal.reason)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busyId ? 'Please wait…' : 'Reject payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

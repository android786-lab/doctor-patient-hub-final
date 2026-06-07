import axiosClient from '../../lib/axiosClient'
import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { AdminContext } from '../../context/AdminContext'
import { roleFromToken } from '../../utils/staffRole.js'
import PageHeader from '../../components/admin/PageHeader'
import AvatarImage from '@doctor-hub/ui/AvatarImage.jsx'
import ConfirmModal from '@doctor-hub/ui/ConfirmModal.jsx'
import { formatMoney } from '@doctor-hub/constants/currency.js'
import Loader from '../../components/shared/Loader.jsx'

function methodLabel(method) {
  if (!method) return 'Payment'
  const m = String(method).toLowerCase()
  if (m === 'jazzcash') return 'JazzCash'
  if (m === 'easypaisa') return 'EasyPaisa'
  if (m === 'sadapay') return 'SadaPay'
  if (m === 'nayapay') return 'NayaPay'
  return method
}

function statusBadge(tab, item) {
  if (tab === 'verified') {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Verified
      </span>
    )
  }
  if (tab === 'rejected') {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Rejected
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
      Awaiting verification
    </span>
  )
}

const TABS = [
  { id: 'pending', label: 'Awaiting verification' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
]

const EMPTY = {
  pending: {
    title: 'All caught up',
    text: 'No payments awaiting verification. Proofs appear here after the patient taps Submit for approval on My appointments.',
  },
  verified: {
    title: 'No verified payments yet',
    text: 'Confirmed bookings and approved payment proofs will appear here.',
  },
  rejected: {
    title: 'No rejected payments',
    text: 'Payments you reject from the awaiting tab will be listed here.',
  },
}

function PaymentCard({ item, tab, onConfirm, onReject, busyId }) {
  const isPending = tab === 'pending'
  const busy = busyId === item.id

  return (
    <div className="dh-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarImage
            src={item.doc_data?.image}
            name={item.doc_data?.name}
            size="md"
            className="rounded-xl"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{item.doc_data?.name}</p>
              {statusBadge(tab, item)}
            </div>
            <p className="text-sm text-slate-500">
              Patient: {item.user_data?.name} · {item.slot_date} {item.slot_time}
            </p>
            <p className="mt-1 text-sm font-bold text-teal-700">
              {formatMoney(item.amount)}{' '}
              <span className="font-normal text-slate-500">
                · {methodLabel(item.payment_method)}
              </span>
            </p>
            {item.payment_reference ? (
              <p className="mt-1 text-xs text-slate-500">
                {tab === 'rejected' ? 'Note: ' : 'Ref: '}
                {item.payment_reference}
              </p>
            ) : null}
            {item.verified_at && tab === 'verified' ? (
              <p className="mt-1 text-xs text-slate-400">
                Verified {new Date(item.verified_at).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
        {isPending && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(item.id)}
              className="dh-btn py-2 text-sm"
            >
              {busy ? '…' : 'Confirm'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(item.id)}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {item.payment_proof_url ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment screenshot
          </p>
          <a
            href={item.payment_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src={item.payment_proof_url}
              alt="Payment proof"
              className="max-h-64 max-w-full rounded-xl border border-slate-200 object-contain"
            />
          </a>
        </div>
      ) : null}
    </div>
  )
}

export default function VerifyPayments() {
  const { backendUrl, aToken } = useContext(AdminContext)
  const isAssistant = roleFromToken(aToken) === 'assistant'
  const paymentsBase = isAssistant ? '/api/assistant/payments' : '/api/payments'
  const [tab, setTab] = useState('pending')
  const [list, setList] = useState([])
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [modal, setModal] = useState(null)

  const headers = { atoken: aToken, token: aToken, dtoken: aToken }

  const loadTab = async (status = tab) => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}${paymentsBase}/verification`, {
        headers,
        params: { status },
      })
      if (data.success) {
        setList(data.appointments ?? [])
      } else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const loadCounts = async () => {
    try {
      const results = await Promise.all(
        TABS.map((t) =>
          axiosClient.get(`${backendUrl}${paymentsBase}/verification`, {
            headers,
            params: { status: t.id },
          })
        )
      )
      setCounts({
        pending: results[0].data?.count ?? 0,
        verified: results[1].data?.count ?? 0,
        rejected: results[2].data?.count ?? 0,
      })
    } catch {
      /* optional */
    }
  }

  const refresh = async () => {
    await Promise.all([loadTab(), loadCounts()])
  }

  const runConfirm = async (appointmentId) => {
    setBusyId(appointmentId)
    try {
      const { data } = await axiosClient.post(
        `${backendUrl}${paymentsBase}/confirm`,
        { appointmentId },
        { headers }
      )
      if (data.success) {
        toast.success('Appointment confirmed')
        setModal(null)
        refresh()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const runReject = async (appointmentId, reason) => {
    setBusyId(appointmentId)
    try {
      const { data } = await axiosClient.post(
        `${backendUrl}${paymentsBase}/reject`,
        { appointmentId, reason },
        { headers }
      )
      if (data.success) {
        toast.success('Payment rejected')
        setModal(null)
        refresh()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => {
    if (aToken) refresh()
  }, [aToken])

  useEffect(() => {
    if (aToken) loadTab(tab)
  }, [aToken, tab])

  const empty = EMPTY[tab]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Payments"
        title="Verify payments"
        description={
          isAssistant
            ? 'Payments for your assigned doctor only — confirm or reject proofs, then review history in each tab.'
            : 'Review manual payment proofs — confirm or reject, then track history in each tab.'
        }
      >
        <button type="button" onClick={refresh} className="dh-btn py-2 text-sm">
          Refresh
        </button>
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {t.label}
            {counts[t.id] != null ? (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                  tab === t.id ? 'bg-white/20' : 'bg-slate-100'
                }`}
              >
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader />
      ) : list.length === 0 ? (
        <div className="dh-card px-8 py-16 text-center">
          <p className="font-semibold text-slate-900">{empty.title}</p>
          <p className="mt-2 text-sm text-slate-500">{empty.text}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((a) => (
            <PaymentCard
              key={a.id}
              item={a}
              tab={tab}
              busyId={busyId}
              onConfirm={(id) =>
                setModal({
                  type: 'verify',
                  appointmentId: id,
                  title: 'Verify payment?',
                  message: 'Confirm this payment and mark the appointment as confirmed.',
                })
              }
              onReject={(id) =>
                setModal({
                  type: 'reject',
                  appointmentId: id,
                  title: 'Reject payment?',
                  message: 'Reject this payment proof. The patient may need to upload again.',
                  reason: '',
                })
              }
            />
          ))}
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
        onConfirm={() => modal?.appointmentId && runConfirm(modal.appointmentId)}
      />

      {modal?.type === 'reject' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
            <textarea
              className="dh-input mt-4 min-h-[72px]"
              placeholder="Reason (optional)"
              value={modal.reason || ''}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
            />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                onClick={() => setModal(null)}
                disabled={!!busyId}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!busyId}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
                onClick={() => runReject(modal.appointmentId, modal.reason)}
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

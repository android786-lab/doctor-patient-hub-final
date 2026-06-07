import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../../assets/assets'
import {
  MANUAL_PAYMENT_ACCOUNT_NAME,
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_WALLETS,
} from '../../utils/paymentAccounts.js'

function copyText(text) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success('Copied'),
    () => toast.info(text)
  )
}

async function compressScreenshot(file) {
  if (!file?.type?.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const maxW = 1200
    let w = bitmap.width
    let h = bitmap.height
    if (w > maxW) {
      h = Math.round((h * maxW) / w)
      w = maxW
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.82)
    })
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export default function PaymentOptionsPanel({
  appointmentId,
  fee,
  formatMoney,
  backendUrl,
  token,
  onClose,
  onStripePay,
  onSubmitted,
}) {
  const [tab, setTab] = useState('card')
  const [method, setMethod] = useState('easypaisa')
  const [reference, setReference] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : '')
  }

  const submitManual = async () => {
    if (!file) {
      toast.warning('Upload a screenshot of your payment')
      return
    }
    setSubmitting(true)
    try {
      const compressed = await compressScreenshot(file)
      const form = new FormData()
      form.append('appointmentId', appointmentId)
      form.append('paymentMethod', method)
      if (reference.trim()) form.append('reference', reference.trim())
      form.append('screenshot', compressed)

      let data
      try {
        const res = await axios.post(`${backendUrl}/api/payments`, form, {
          headers: {
            token,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 90000,
        })
        data = res.data
      } catch {
        const res = await axios.post(`${backendUrl}/api/user/payment-manual`, form, {
          headers: { token, 'Content-Type': 'multipart/form-data' },
          timeout: 90000,
        })
        data = res.data
      }
      if (data.success) {
        toast.success(data.message)
        onSubmitted?.()
        onClose?.()
      } else {
        toast.error(data.message || 'Upload failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed'
      toast.error(msg === 'fetch failed' || msg === 'Network Error' ? 'Server unreachable — restart backend and try again' : msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Pay {fee ? formatMoney(fee) : '—'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Close
        </button>
      </div>

      <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('card')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
            tab === 'card' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Card (Stripe)
        </button>
        <button
          type="button"
          onClick={() => setTab('wallet')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
            tab === 'wallet' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          JazzCash / EasyPaisa
        </button>
      </div>

      {tab === 'card' ? (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">Pay securely with debit or credit card via Stripe.</p>
          <button
            type="button"
            onClick={() => onStripePay(appointmentId)}
            className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 hover:bg-slate-50"
          >
            <img className="h-5 max-w-[5.5rem] object-contain" src={assets.stripe_logo} alt="Stripe" />
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-xs text-slate-600">
            Send the exact fee to <strong>{MANUAL_PAYMENT_ACCOUNT_NAME}</strong>, then upload your
            transaction screenshot. Our team will verify and confirm your booking.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {MANUAL_PAYMENT_WALLETS.map((w) => (
              <div key={w.id} className="rounded-lg border border-white bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                  {w.label}
                </p>
                <p className="mt-1 font-mono text-base font-bold text-slate-900">{w.number}</p>
                {w.note ? <p className="mt-1 text-[11px] text-slate-500">{w.note}</p> : null}
                <button
                  type="button"
                  onClick={() => copyText(w.number)}
                  className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
                >
                  Copy number
                </button>
              </div>
            ))}
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">How did you pay?</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {MANUAL_PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Transaction ID (optional)</span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Last 4 digits or Txn ID"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Payment screenshot</span>
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="mt-1 w-full text-xs text-slate-600"
            />
          </label>

          {preview ? (
            <img
              src={preview}
              alt="Payment proof preview"
              className="max-h-40 rounded-lg border border-slate-200 object-contain"
            />
          ) : null}

          <button
            type="button"
            disabled={submitting}
            onClick={submitManual}
            className="dh-btn w-full py-2.5 text-sm disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Submit for approval'}
          </button>
        </div>
      )}
    </div>
  )
}

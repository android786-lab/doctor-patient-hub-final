import { toast } from 'react-toastify'
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

/** Wallet transfer details + screenshot upload (no Stripe). */
export default function ManualPaymentProofForm({
  fee,
  formatMoney,
  method,
  onMethodChange,
  reference,
  onReferenceChange,
  onFileChange,
  preview,
  fileName,
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Send exactly <strong className="text-slate-900">{formatMoney(fee)}</strong> to{' '}
        <strong>{MANUAL_PAYMENT_ACCOUNT_NAME}</strong>, then upload your transaction screenshot.
        Your appointment is only created after payment proof is submitted.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {MANUAL_PAYMENT_WALLETS.map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{w.label}</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900">{w.number}</p>
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

      <label className="block text-sm font-medium text-slate-700">
        How did you pay?
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value)}
          className="dh-input mt-1.5 w-full"
        >
          {MANUAL_PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Transaction ID <span className="font-normal text-slate-400">(optional)</span>
        <input
          type="text"
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder="Last 4 digits or Txn ID"
          className="dh-input mt-1.5 w-full"
        />
      </label>

      <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-6 text-center">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-teal-100">
            📤
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {fileName || 'Tap to upload screenshot'}
          </p>
          <p className="mt-1 text-xs text-slate-500">JPG or PNG · required</p>
        </label>
        {preview ? (
          <img
            src={preview}
            alt="Payment preview"
            className="mx-auto mt-4 max-h-52 rounded-xl border border-slate-200 object-contain shadow-sm"
          />
        ) : null}
      </div>
    </div>
  )
}

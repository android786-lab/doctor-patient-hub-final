import { useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/layout/PageHeader'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const submit = (e) => {
    e.preventDefault()
    toast.success('Message received — Doctor Hub team will respond soon.')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Contact"
        title="We are here to help"
        description="Questions about appointments, payments, or your project demo? Reach the Doctor Hub team directly."
      />

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="dh-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Office
            </p>
            <p className="mt-2 text-slate-700">
              Jinnah Road, Suite 350
              <br />
              Vehari, Punjab, Pakistan
            </p>
          </div>
          <div className="dh-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Direct line
            </p>
            <p className="mt-2 text-slate-700">
              Tel: +92 302 3465721
              <br />
              Email: hamzaweb3565@gmail.com
            </p>
          </div>
          <div className="dh-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Hours
            </p>
            <p className="mt-2 text-slate-700">Mon – Sat · 9:00 AM – 6:00 PM PKT</p>
          </div>
        </div>

        <form onSubmit={submit} className="dh-card p-8">
          <h2 className="font-display text-xl font-semibold text-slate-900">Send a message</h2>
          <p className="mt-1 text-sm text-slate-500">Typical response within 24 hours</p>
          <div className="mt-6 space-y-4">
            <input
              required
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <textarea
              required
              rows={5}
              placeholder="How can we help?"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <button type="submit" className="dh-btn mt-6 w-full">
            Send message
          </button>
        </form>
      </div>
    </div>
  )
}

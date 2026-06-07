import { useState } from 'react'
import { toast } from 'react-toastify'
import SectionHead from '@doctor-hub/ui/SectionHead.jsx'
import TrustBar from '@doctor-hub/ui/TrustBar.jsx'

const deskInfo = [
  { label: 'Hospital address', value: 'Jinnah Road, Suite 350\nVehari, Punjab, Pakistan', icon: '📍' },
  { label: 'Help desk phone', value: '+92 302 3465721\n+92 306 7571707', icon: '📞' },
  { label: 'Email', value: 'hamzaweb3565@gmail.com', icon: '✉️' },
  { label: 'Visiting hours', value: 'Mon – Sat · 9:00 AM – 6:00 PM PKT', icon: '🕐' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const submit = (e) => {
    e.preventDefault()
    toast.success('Message received — our hospital desk will respond within 24 hours.')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="space-y-10 pb-16">
      <div className="dh-hero--clinical">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Help desk</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Contact the hospital</h1>
        <p className="mt-3 max-w-2xl text-sm text-teal-100/90 md:text-base">
          Appointments, billing, medical records, or general inquiries — our front desk team is here to help.
        </p>
      </div>

      <TrustBar />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionHead eyebrow="Reach us" title="Hospital front desk" description="Walk-in or contact us before your visit." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {deskInfo.map((item) => (
              <div key={item.label} className="dh-portal-panel p-5">
                <span className="text-xl">{item.icon}</span>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-teal-700">{item.label}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="dh-portal-panel p-6 md:p-8">
          <SectionHead eyebrow="Write to us" title="Send a message" description="Typical response within 24 hours." />
          <div className="mt-6 space-y-4">
            <input
              required
              placeholder="Your full name"
              className="dh-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Email address"
              className="dh-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <textarea
              required
              rows={5}
              placeholder="How can our hospital team help you?"
              className="dh-textarea"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <button type="submit" className="dh-btn mt-6 w-full">
            Submit to help desk
          </button>
        </form>
      </div>
    </div>
  )
}

import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const emptyForm = () => ({
  name: '',
  address: '',
  city: '',
  phone: '',
  timings: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
})

export default function DoctorClinics() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/doctor/clinics`, {
        headers: { dtoken: dToken, token: dToken },
      })
      setClinics(data.clinics || [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dToken) load()
  }, [dToken])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({
      name: c.name || '',
      address: c.address || '',
      city: c.city || '',
      phone: c.phone || '',
      timings: { ...emptyForm().timings, ...(c.timings || {}) },
    })
    setFormOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const headers = { dtoken: dToken }
      if (editingId) {
        await axiosClient.patch(`${backendUrl}/api/clinics/${editingId}`, form, { headers })
        toast.success('Clinic updated')
      } else {
        await axiosClient.post(
          `${backendUrl}/api/doctor/clinic`,
          {
            clinicName: form.name,
            name: form.name,
            address: form.address,
            city: form.city,
            phone: form.phone,
            timings: form.timings,
            availableDays: DAYS.filter((d) => form.timings[d.key]).map((d) => d.key),
          },
          { headers: { dtoken: dToken, token: dToken } }
        )
        toast.success('Clinic created')
      }
      setFormOpen(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Locations"
        title="My clinics"
        description="Manage clinic addresses and weekly timings."
      >
        <button type="button" onClick={openCreate} className="dh-btn py-2 text-sm">
          Add new clinic
        </button>
      </PageHeader>

      {formOpen && (
        <form onSubmit={save} className="dh-card mb-8 space-y-4 p-6">
          <h3 className="font-semibold text-slate-900">
            {editingId ? 'Edit clinic' : 'New clinic'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="dh-input"
              placeholder="Clinic name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="dh-input"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className="dh-input sm:col-span-2"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className="dh-input"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Weekly timings (optional)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DAYS.map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-slate-500">{d.label}</span>
                  <input
                    className="dh-input flex-1 py-2 text-sm"
                    placeholder="9:00 AM – 5:00 PM"
                    value={form.timings[d.key] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        timings: { ...form.timings, [d.key]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="dh-btn py-2 text-sm">
              {saving ? 'Saving…' : 'Save clinic'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : clinics.length === 0 ? (
        <div className="dh-card px-8 py-12 text-center text-slate-500">
          No clinics yet. Add your first clinic to get started.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clinics.map((c) => (
            <article key={c.id} className="dh-card p-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">{c.name}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {[c.address, c.city].filter(Boolean).join(', ') || '—'}
              </p>
              {c.phone && <p className="mt-1 text-sm text-teal-700">{c.phone}</p>}
              {c.timings && (
                <ul className="mt-3 space-y-0.5 text-xs text-slate-500">
                  {DAYS.filter((d) => c.timings[d.key]).map((d) => (
                    <li key={d.key}>
                      <span className="font-medium">{d.label}:</span> {c.timings[d.key]}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => openEdit(c)}
                className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
              >
                Edit clinic
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

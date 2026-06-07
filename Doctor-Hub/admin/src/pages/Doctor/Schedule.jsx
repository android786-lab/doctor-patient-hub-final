import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'
import { Link } from 'react-router-dom'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const SLOT_OPTIONS = [15, 30, 45, 60]

const defaultSchedule = () =>
  Object.fromEntries(
    DAYS.map((d) => [
      d.key,
      {
        enabled: d.key !== 'sun',
        start: d.key === 'sat' || d.key === 'sun' ? '10:00' : '10:00',
        end: d.key === 'sat' || d.key === 'sun' ? '17:00' : '21:00',
      },
    ])
  )

function nextDays(count = 14) {
  const out = []
  const d = new Date()
  for (let i = 0; i < count; i++) {
    const x = new Date(d)
    x.setDate(d.getDate() + i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

export default function DoctorSchedule() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weeklySchedule, setWeeklySchedule] = useState(defaultSchedule)
  const [slotDuration, setSlotDuration] = useState(30)
  const [accepting, setAccepting] = useState(true)
  const [selectedDate, setSelectedDate] = useState(nextDays(1)[0])
  const [dateSchedules, setDateSchedules] = useState({})

  const headers = () => ({ headers: { dtoken: dToken } })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/doctor/schedule`, headers())
      if (data.success) {
        setWeeklySchedule({ ...defaultSchedule(), ...data.weekly_schedule })
        setSlotDuration(data.slot_duration_minutes || 30)
        setAccepting(data.accepting_appointments !== false)
        const map = {}
        for (const row of data.date_schedules || []) {
          map[row.date] = row.time_slots || []
        }
        setDateSchedules(map)
      } else {
        toast.error(data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dToken) load()
  }, [dToken])

  const updateDay = (key, field, value) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const date_schedules = Object.entries(dateSchedules).map(([date, time_slots]) => ({
        date,
        time_slots,
        is_available: time_slots.length > 0,
      }))

      const { data } = await axiosClient.post(
        `${backendUrl}/api/doctor/schedule`,
        {
          weekly_schedule: weeklySchedule,
          slot_duration_minutes: slotDuration,
          date_schedules,
        },
        headers()
      )
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Weekly schedule"
        description="Set which days and hours patients can book. Slots appear on the patient website after you save."
      />

      {!accepting && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your profile is marked <strong>not available</strong> — patients may not see you in search.
          Turn on availability in{' '}
          <Link to="/doctor/profile" className="font-semibold underline">
            My profile
          </Link>
          .
        </div>
      )}

      <form onSubmit={save} className="mt-6 space-y-6">
        <section className="dh-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Slot length
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            How long each appointment slot lasts on the booking page.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SLOT_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSlotDuration(m)}
                className={`rounded-xl px-4 py-2 text-sm font-medium ring-1 transition ${
                  slotDuration === m
                    ? 'bg-teal-700 text-white ring-teal-700'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </section>

        <section className="dh-card overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Working days & hours</h3>
            <p className="text-sm text-slate-500">Use 24-hour time (e.g. 09:00, 17:30)</p>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {DAYS.map((d) => (
                <div key={d.key} className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {DAYS.map((d) => {
                const day = weeklySchedule[d.key] || {}
                return (
                  <li
                    key={d.key}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-teal-600"
                        checked={day.enabled !== false}
                        onChange={(e) => updateDay(d.key, 'enabled', e.target.checked)}
                      />
                      <span className="w-28 font-medium text-slate-800">{d.label}</span>
                    </label>

                    {day.enabled !== false ? (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input
                          type="time"
                          className="dh-input py-2"
                          value={day.start || '10:00'}
                          onChange={(e) => updateDay(d.key, 'start', e.target.value)}
                        />
                        <span className="text-sm text-slate-400">to</span>
                        <input
                          type="time"
                          className="dh-input py-2"
                          value={day.end || '21:00'}
                          onChange={(e) => updateDay(d.key, 'end', e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Day off</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="dh-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Date-specific slots
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Pick a date and toggle times when you are available (calendar-style).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {nextDays(14).map((d) => {
              const label = new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
              const active = selectedDate === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${
                    active
                      ? 'bg-teal-700 text-white ring-teal-700'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DEFAULT_SLOTS.map((slot) => {
              const selected = (dateSchedules[selectedDate] || []).includes(slot)
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setDateSchedules((prev) => {
                      const current = [...(prev[selectedDate] || [])]
                      const idx = current.indexOf(slot)
                      if (idx >= 0) current.splice(idx, 1)
                      else current.push(slot)
                      current.sort()
                      return { ...prev, [selectedDate]: current }
                    })
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 ${
                    selected
                      ? 'bg-teal-600 text-white ring-teal-600'
                      : 'bg-slate-50 text-slate-700 ring-slate-200'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Selected for {selectedDate}:{' '}
            {(dateSchedules[selectedDate] || []).join(', ') || 'none — day off'}
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving || loading} className="dh-btn py-2.5 text-sm">
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
          <Link
            to="/doctor/clinics"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            Clinic addresses & timings →
          </Link>
        </div>
      </form>

      <div className="dh-card mt-8 p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">How patients book</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Patient opens your profile on the website and clicks Book.</li>
          <li>Available slots are generated from this weekly schedule (minus already booked times).</li>
          <li>After payment, the slot is marked booked automatically.</li>
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Schedule is saved to your doctor profile automatically. Optional: run{' '}
          <code className="rounded bg-slate-100 px-1">supabase/012_doctors_weekly_schedule.sql</code> in Supabase
          for dedicated columns.
        </p>
      </div>
    </div>
  )
}

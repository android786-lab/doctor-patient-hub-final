import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'
import { Link } from 'react-router-dom'
import {
  WORK_START,
  WORK_END,
  SLOT_DURATION_OPTIONS,
  buildSlotsForDuration,
  formatSlotLabel,
  normalizeSlotDuration,
} from '../../utils/slotHelpers.js'

const DAYS = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
]

const emptyWeek = () =>
  Object.fromEntries(
    DAYS.map((d) => [
      d.key,
      { enabled: false, start: WORK_START, end: WORK_END, time_slots: [] },
    ])
  )

function mergeLoadedSchedule(raw, durationMinutes) {
  const base = emptyWeek()
  const defaultSlots = buildSlotsForDuration(durationMinutes)
  if (!raw || typeof raw !== 'object') return base

  for (const d of DAYS) {
    const day = raw[d.key]
    if (!day) continue
    const slots = Array.isArray(day.time_slots)
      ? day.time_slots.filter(Boolean)
      : day.enabled !== false
        ? defaultSlots
        : []
    base[d.key] = {
      enabled: day.enabled !== false && slots.length > 0,
      start: day.start || WORK_START,
      end: day.end || WORK_END,
      time_slots: slots,
    }
  }
  return base
}

export default function DoctorSchedule() {
  const { dToken, backendUrl } = useContext(DoctorContext)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weeklySchedule, setWeeklySchedule] = useState(emptyWeek)
  const [slotDuration, setSlotDuration] = useState(30)
  const [customDuration, setCustomDuration] = useState('')
  const [accepting, setAccepting] = useState(true)
  const [activeDay, setActiveDay] = useState('mon')

  const headers = () => ({ headers: { dtoken: dToken } })

  const slotGrid = useMemo(() => buildSlotsForDuration(slotDuration), [slotDuration])

  const enabledDays = useMemo(
    () => DAYS.filter((d) => weeklySchedule[d.key]?.enabled),
    [weeklySchedule]
  )

  useEffect(() => {
    if (enabledDays.length && !enabledDays.find((d) => d.key === activeDay)) {
      setActiveDay(enabledDays[0].key)
    }
  }, [enabledDays, activeDay])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/doctor/schedule`, headers())
      if (data.success) {
        const duration = normalizeSlotDuration(data.slot_duration_minutes)
        setSlotDuration(duration)
        const preset = SLOT_DURATION_OPTIONS.some((o) => o.value === duration)
        setCustomDuration(preset ? '' : String(duration))
        setWeeklySchedule(mergeLoadedSchedule(data.weekly_schedule, duration))
        setAccepting(data.accepting_appointments !== false)
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

  const applyDuration = (minutes) => {
    const next = normalizeSlotDuration(minutes)
    setSlotDuration(next)
    const preset = SLOT_DURATION_OPTIONS.some((o) => o.value === next)
    setCustomDuration(preset ? '' : String(next))

    const grid = buildSlotsForDuration(next)
    const gridSet = new Set(grid)

    setWeeklySchedule((prev) => {
      const out = { ...prev }
      for (const d of DAYS) {
        const day = prev[d.key]
        if (!day?.enabled) continue
        const kept = (day.time_slots || []).filter((s) => gridSet.has(s))
        out[d.key] = {
          ...day,
          time_slots: kept.length ? kept : [...grid],
          enabled: kept.length > 0 || grid.length > 0,
        }
      }
      return out
    })
  }

  const toggleWorkingDay = (key) => {
    setWeeklySchedule((prev) => {
      const day = prev[key] || {}
      const nextEnabled = !day.enabled
      return {
        ...prev,
        [key]: {
          ...day,
          enabled: nextEnabled,
          start: WORK_START,
          end: WORK_END,
          time_slots: nextEnabled ? [...slotGrid] : [],
        },
      }
    })
    setActiveDay(key)
  }

  const toggleSlot = (dayKey, slot) => {
    setWeeklySchedule((prev) => {
      const day = prev[dayKey] || { enabled: true, time_slots: [] }
      const current = [...(day.time_slots || [])]
      const idx = current.indexOf(slot)
      if (idx >= 0) current.splice(idx, 1)
      else current.push(slot)
      current.sort()
      return {
        ...prev,
        [dayKey]: {
          ...day,
          enabled: current.length > 0,
          time_slots: current,
          start: WORK_START,
          end: WORK_END,
        },
      }
    })
  }

  const selectAllSlots = (dayKey) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: true,
        time_slots: [...slotGrid],
        start: WORK_START,
        end: WORK_END,
      },
    }))
  }

  const clearDaySlots = (dayKey) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: false,
        time_slots: [],
      },
    }))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!enabledDays.length) {
      toast.warn('Select at least one working day with time slots')
      return
    }
    setSaving(true)
    try {
      const payload = {}
      for (const d of DAYS) {
        const day = weeklySchedule[d.key]
        payload[d.key] = {
          enabled: day.enabled && day.time_slots?.length > 0,
          start: day.start || WORK_START,
          end: day.end || WORK_END,
          time_slots: day.enabled ? day.time_slots || [] : [],
        }
      }

      const { data } = await axiosClient.post(
        `${backendUrl}/api/doctor/schedule`,
        {
          weekly_schedule: payload,
          slot_duration_minutes: slotDuration,
        },
        headers()
      )
      if (data.success) toast.success(data.message || 'Schedule saved')
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  const durationLabel =
    SLOT_DURATION_OPTIONS.find((o) => o.value === slotDuration)?.label ||
    `${slotDuration} min`

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Weekly availability"
        description="Set your appointment length and choose which time slots patients can book."
      />

      {!accepting && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your profile is marked <strong>not available</strong>. Turn on availability in{' '}
          <Link to="/doctor/profile" className="font-semibold underline">
            My profile
          </Link>
          .
        </div>
      )}

      <form onSubmit={save} className="mt-6 space-y-6">
        <section className="dh-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Step 1 · Appointment length
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            How long is each appointment? Slots are generated in {durationLabel} intervals (9 AM – 5 PM).
          </p>
          {loading ? (
            <div className="mt-4 h-12 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {SLOT_DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => applyDuration(opt.value)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                    slotDuration === opt.value
                      ? 'bg-teal-700 text-white ring-teal-700'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <label htmlFor="custom-duration" className="text-sm text-slate-600">
                  Custom
                </label>
                <input
                  id="custom-duration"
                  type="number"
                  min={10}
                  max={120}
                  step={5}
                  placeholder="e.g. 20"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  onBlur={() => {
                    if (customDuration) applyDuration(customDuration)
                  }}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                />
                <span className="text-sm text-slate-500">min</span>
              </div>
            </div>
          )}
        </section>

        <section className="dh-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Step 2 · Working days
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Select every day you accept appointments (e.g. Mon, Wed, Thu only).
          </p>
          {loading ? (
            <div className="mt-4 h-12 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const on = weeklySchedule[d.key]?.enabled
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleWorkingDay(d.key)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                      on
                        ? 'bg-teal-700 text-white ring-teal-700'
                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d.short}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {enabledDays.length > 0 && !loading && (
          <section className="dh-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Step 3 · Free slots per day
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              For each working day, tap the {durationLabel} slots you are free ({WORK_START} – {WORK_END}).
            </p>

            <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              {enabledDays.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setActiveDay(d.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    activeDay === d.key
                      ? 'bg-teal-100 text-teal-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d.label} ({(weeklySchedule[d.key]?.time_slots || []).length})
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectAllSlots(activeDay)}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => clearDaySlots(activeDay)}
                className="text-xs font-semibold text-slate-500 hover:underline"
              >
                Clear day
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slotGrid.map((slot) => {
                const selected = (weeklySchedule[activeDay]?.time_slots || []).includes(slot)
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(activeDay, slot)}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ring-1 transition ${
                      selected
                        ? 'bg-teal-600 text-white ring-teal-600'
                        : 'bg-slate-50 text-slate-700 ring-slate-200 hover:bg-white'
                    }`}
                  >
                    {formatSlotLabel(slot)}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {DAYS.find((d) => d.key === activeDay)?.label}:{' '}
              {(weeklySchedule[activeDay]?.time_slots || [])
                .map(formatSlotLabel)
                .join(', ') || 'No slots — day off'}
            </p>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving || loading} className="dh-btn py-2.5 text-sm">
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
          <Link to="/doctor/clinics" className="text-sm font-medium text-teal-700 hover:underline">
            Clinic addresses & timings →
          </Link>
        </div>
      </form>

      <div className="dh-card mt-8 p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">How patients book</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Each slot is {durationLabel} long — patients only see times you selected.</li>
          <li>Already booked slots disappear automatically.</li>
          <li>If a slot was just taken, they are shown other free slots on that day.</li>
        </ol>
      </div>
    </div>
  )
}

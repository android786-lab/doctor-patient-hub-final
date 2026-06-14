import {
  fetchDoctorRows,
  fetchDoctorRowById,
  loadProfiles,
  mapDoctorSummary,
  mapLegacyDoctorCard,
  isDoctorVisible,
  displayName,
} from '../utils/doctorRows.js'
import { attachSchedulesFromTable, fetchDoctorSchedule } from '../utils/doctorScheduleRows.js'
import { fetchDateSchedules } from '../utils/doctorScheduleDateRows.js'
import { upsertAssistantAssignment } from '../utils/authUserRows.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function matchesSearch(row, profile, search) {
  if (!search) return true
  const q = search.toLowerCase().trim()
  const haystack = [displayName(row, profile), row.specialization]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function matchesCity(row, city) {
  if (!city) return true
  const q = city.toLowerCase().trim()
  const clinics = row.clinics || []
  return clinics.some((c) => c.city && String(c.city).toLowerCase().includes(q))
}

function matchesDisease(row, disease) {
  if (!disease) return true
  const q = disease.toLowerCase().trim()
  const list = Array.isArray(row.diseases) ? row.diseases : []
  if (list.some((d) => String(d).toLowerCase().includes(q))) return true
  if (row.specialization && String(row.specialization).toLowerCase().includes(q)) return true
  return false
}

export async function listDoctorsPublic(req, res) {
  try {
    const { search, city } = req.query
    const treatment_type = req.query.treatment_type || req.query.type
    const disease = req.query.disease

    let rows = await fetchDoctorRows()
    const profileIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
    const profiles = await loadProfiles(profileIds)

    rows = rows.filter((row) => isDoctorVisible(row))

    if (treatment_type) {
      rows = rows.filter(
        (row) =>
          row.treatment_type &&
          row.treatment_type.toLowerCase() === treatment_type.toLowerCase()
      )
    }

    if (disease) {
      rows = rows.filter((row) => matchesDisease(row, disease))
    }

    if (search) {
      rows = rows.filter(
        (row) =>
          matchesSearch(row, profiles[row.user_id], search) || matchesDisease(row, search)
      )
    }

    if (city) {
      rows = rows.filter((row) => matchesCity(row, city))
    }

    const doctors = rows.map((row) => mapDoctorSummary(row, profiles[row.user_id]))
    return res.json(doctors)
  } catch (err) {
    console.error('listDoctorsPublic:', err)
    return res.status(500).json({ message: err.message || 'Failed to load doctors' })
  }
}

export async function getDoctorByIdPublic(req, res, next) {
  if (!UUID_RE.test(req.params.id)) {
    return next()
  }

  try {
    const { id } = req.params
    const row = await fetchDoctorRowById(id)

    if (!row || !isDoctorVisible(row)) {
      return res.status(404).json({ message: 'Doctor not found' })
    }

    const profiles = await loadProfiles(row.user_id ? [row.user_id] : [])
    const profile = row.user_id ? profiles[row.user_id] : null
    const summary = mapDoctorSummary(row, profile)

    let weekly_schedule = {}
    let slot_duration_minutes = 30
    let date_schedules = []
    if (row.user_id) {
      try {
        const sched = await fetchDoctorSchedule(row.user_id)
        weekly_schedule = sched.weekly_schedule || {}
        slot_duration_minutes = sched.slot_duration_minutes || 30
      } catch {
        /* optional */
      }
    }
    try {
      date_schedules = await fetchDateSchedules(row.id)
    } catch {
      date_schedules = []
    }

    return res.json({
      ...summary,
      phone: row.phone ?? null,
      is_active: row.is_active !== false,
      user_id: row.user_id ?? null,
      weekly_schedule,
      slot_duration_minutes,
      date_schedules,
      slots_booked: row.slots_booked || {},
      clinics: (row.clinics || []).map((c) => ({
        id: c.id ?? null,
        name: c.name ?? null,
        city: c.city ?? null,
        address: c.address ?? null,
        phone: c.phone ?? null,
        timings: c.timings ?? {},
      })),
    })
  } catch (err) {
    console.error('getDoctorByIdPublic:', err)
    return res.status(500).json({ message: err.message || 'Failed to load doctor' })
  }
}

/** Legacy GET /api/doctor/list — CareLink home page cards */
export async function listDoctorsLegacy(req, res) {
  try {
    const { treatment, disease, speciality } = req.query

    let rows = await fetchDoctorRows()
    const needsScheduleTable = rows.some(
      (r) => !r.weekly_schedule || !Object.keys(r.weekly_schedule || {}).length
    )
    if (needsScheduleTable) {
      rows = await attachSchedulesFromTable(rows)
    }
    rows = rows.filter((row) => isDoctorVisible(row))
    const profileIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
    const profiles = await loadProfiles(profileIds)

    if (treatment) {
      rows = rows.filter(
        (r) => r.treatment_type && r.treatment_type.toLowerCase() === treatment.toLowerCase()
      )
    }
    if (speciality) {
      const s = speciality.toLowerCase()
      rows = rows.filter(
        (r) => r.specialization && r.specialization.toLowerCase().includes(s)
      )
    }
    if (disease) {
      const d = disease.toLowerCase()
      rows = rows.filter((r) => (r.diseases || []).some((x) => String(x).toLowerCase().includes(d)))
    }

    const doctors = rows.map((row) => mapLegacyDoctorCard(row, profiles[row.user_id], { forList: true }))
    return res.json({ success: true, doctors })
  } catch (err) {
    console.error('listDoctorsLegacy:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function assignAssistantToDoctor(req, res) {
  try {
    const doctorId = req.params.id
    const assistantUserId = req.body.assistant_id

    await upsertAssistantAssignment(assistantUserId, doctorId)

    return res.status(201).json({
      message: 'Assistant assigned',
      doctor_id: doctorId,
      assistant_id: assistantUserId,
    })
  } catch (err) {
    console.error('assignAssistantToDoctor:', err)
    return res.status(500).json({ message: err.message || 'Failed to assign assistant' })
  }
}

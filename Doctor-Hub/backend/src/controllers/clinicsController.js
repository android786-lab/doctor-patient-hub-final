import {
  fetchClinicsForDoctor,
  createClinicForDoctor,
  updateClinicForDoctor,
  createScheduleForClinic,
} from '../utils/clinicRows.js'
import { resolveDoctorContextIdsOrCreate } from '../utils/appointmentDoctorRows.js'

export async function listMyClinics(req, res) {
  try {
    const clinics = await fetchClinicsForDoctor(req.user?.id)
    return res.json({ clinics })
  } catch (err) {
    console.error('listMyClinics:', err)
    return res.status(500).json({ message: err.message || 'Failed to load clinics' })
  }
}

export async function createClinic(req, res) {
  try {
    const { name, address, city, phone, timings, doctor_id } = req.body
    const { doctorRowId } = await resolveDoctorContextIdsOrCreate(req.user?.id)

    if (doctor_id !== doctorRowId) {
      return res.status(403).json({ message: 'doctor_id does not match authenticated doctor' })
    }

    const clinic = await createClinicForDoctor(req.user?.id, {
      name,
      address,
      city,
      phone,
      timings,
    })

    return res.status(201).json({ message: 'Clinic created', clinic })
  } catch (err) {
    console.error('createClinic:', err)
    return res.status(500).json({ message: err.message || 'Failed to create clinic' })
  }
}

export async function createClinicSchedule(req, res) {
  try {
    const { id: clinicId } = req.params
    const { day_of_week, start_time, end_time, slot_duration_minutes } = req.body

    const result = await createScheduleForClinic(req.user?.id, clinicId, {
      day_of_week,
      start_time,
      end_time,
      slot_duration_minutes,
    })

    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message || 'Could not create schedule' })
    }

    return res.status(201).json({ message: 'Schedule created', schedule: result.schedule })
  } catch (err) {
    console.error('createClinicSchedule:', err)
    return res.status(500).json({ message: err.message || 'Failed to create schedule' })
  }
}

export async function updateClinic(req, res) {
  try {
    const { id } = req.params
    const { name, address, city, phone, timings } = req.body

    const result = await updateClinicForDoctor(req.user?.id, id, {
      name,
      address,
      city,
      phone,
      timings,
    })

    if (!result.ok) {
      return res.status(result.status || 403).json({ message: result.message || 'Access denied' })
    }

    return res.json({ message: 'Clinic updated', clinic: result.clinic })
  } catch (err) {
    console.error('updateClinic:', err)
    return res.status(500).json({ message: err.message || 'Failed to update clinic' })
  }
}

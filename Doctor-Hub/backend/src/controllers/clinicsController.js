import {
  fetchClinicsForDoctor,
  createClinicForDoctor,
  updateClinicForDoctor,
} from '../utils/clinicRows.js'

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
    const { name, address, city, phone, timings } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Clinic name is required' })
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

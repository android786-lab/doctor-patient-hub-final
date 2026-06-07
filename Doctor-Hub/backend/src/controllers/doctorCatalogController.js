import { getDoctorCatalog, addCatalogEntry } from '../utils/doctorCatalogRows.js'

export async function listDoctorCatalog(req, res) {
  try {
    const catalog = await getDoctorCatalog()
    return res.json({ success: true, catalog })
  } catch (err) {
    console.error('listDoctorCatalog:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

export async function postCatalogEntry(req, res) {
  try {
    const { type, value, label } = req.body
    if (!type || !value) {
      return res.status(400).json({ success: false, message: 'type and value are required' })
    }
    const catalog = await addCatalogEntry(type, value, label)
    return res.json({ success: true, message: 'Added to catalog', catalog })
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message })
  }
}

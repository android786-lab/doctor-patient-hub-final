import supabase from '../config/supabaseClient.js'

/** Medical history: append-only — doctors add, patients read */
const getHistory = async (req, res) => {
  try {
    const { userId } = req.body
    const { data, error } = await supabase
      .from('medical_history')
      .select('*, doctors(name, speciality)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, history: data ?? [] })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

const addHistory = async (req, res) => {
  try {
    const { doctorId, userId, title, description, diagnosis } = req.body
    if (!title || !description || !userId) {
      return res.json({ success: false, message: 'Missing fields' })
    }

    const { data, error } = await supabase
      .from('medical_history')
      .insert({
        user_id: userId,
        doctor_id: doctorId || null,
        title,
        description,
        diagnosis: diagnosis || null,
      })
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, record: data })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export { getHistory, addHistory }

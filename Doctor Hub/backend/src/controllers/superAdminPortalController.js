import supabase from '../config/supabase.js'
import { findUserByEmail } from '../utils/authUserRows.js'

function isMissingTable(err) {
  return /does not exist|relation/i.test(err?.message || '')
}

export async function listAdmins(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })

    if (error) throw error

    const admins = (data || []).map((u) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      role: u.role,
      is_active: u.is_active !== false,
      created_at: u.created_at,
    }))

    return res.json({ success: true, admins })
  } catch (err) {
    console.error('listAdmins:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load admins' })
  }
}

export async function promoteToAdmin(req, res) {
  try {
    const { userId, email } = req.body
    if (!userId && !email) {
      return res.status(400).json({ success: false, message: 'userId or email is required' })
    }

    let targetId = userId
    if (!targetId && email) {
      const user = await findUserByEmail(email.toLowerCase().trim())
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }
      targetId = user.id
    }

    const { data: target, error: fetchErr } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', targetId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })

    const current = (target.role || '').toLowerCase()
    if (current === 'super_admin') {
      return res.status(400).json({ success: false, message: 'User is already super admin' })
    }

    const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', targetId)
    if (error) throw error

    return res.status(201).json({
      success: true,
      message: 'User promoted to admin',
      user: { id: targetId, email: target.email, role: 'admin' },
    })
  } catch (err) {
    console.error('promoteToAdmin:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to promote user' })
  }
}

export async function demoteAdmin(req, res) {
  try {
    const { userId } = req.body
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' })
    }

    if (req.user?.id === userId) {
      return res.status(403).json({ success: false, message: 'Cannot demote your own account' })
    }

    const { data: target, error: fetchErr } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })

    if (target.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot demote super admin' })
    }

    const { error } = await supabase.from('users').update({ role: 'patient' }).eq('id', userId)
    if (error) throw error

    return res.json({ success: true, message: 'Admin demoted to patient' })
  } catch (err) {
    console.error('demoteAdmin:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to demote admin' })
  }
}

async function patientIdForUser(userId) {
  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id || null
}

export async function deleteUserById(req, res) {
  try {
    const { id } = req.params

    if (req.user?.id === id) {
      return res.status(403).json({ success: false, message: 'Cannot delete your own account' })
    }

    const { data: target, error: fetchErr } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })

    if (target.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete super admin accounts' })
    }

    const patientId = await patientIdForUser(id)
    if (patientId) {
      const { count, error: histErr } = await supabase
        .from('medical_history')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patientId)

      if (!histErr && (count ?? 0) > 0) {
        return res.status(409).json({
          success: false,
          message:
            'User has medical history records that cannot be deleted. Deactivate the account instead.',
          code: 'MEDICAL_HISTORY_PROTECTED',
        })
      }
    }

    await supabase.from('assistants').delete().eq('user_id', id)
    await supabase.from('patients').delete().eq('user_id', id)
    await supabase.from('doctors').delete().eq('user_id', id)

    const { error: userErr } = await supabase.from('users').delete().eq('id', id)
    if (userErr && !isMissingTable(userErr)) {
      const { error: softErr } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id)
      if (softErr) throw userErr
      return res.json({
        success: true,
        message: 'User deactivated (hard delete blocked by database rules)',
        deactivated: true,
      })
    }

    return res.json({
      success: true,
      message: 'User deleted. Medical history records were not removed.',
    })
  } catch (err) {
    console.error('deleteUserById:', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete user' })
  }
}

import supabase from '../config/supabase.js'

function isMissingRelation(err) {
  const msg = err?.message || ''
  return /relation|does not exist|schema cache/i.test(msg)
}

export async function findPendingRequestByEmail(email) {
  const normalized = email.toLowerCase().trim()
  const { data, error } = await supabase
    .from('admin_registration_requests')
    .select('id, status, email, full_name, created_at')
    .eq('status', 'pending')
    .ilike('email', normalized)
    .maybeSingle()

  if (error && isMissingRelation(error)) return null
  if (error) throw error
  return data
}

export async function findAnyRequestByEmail(email) {
  const normalized = email.toLowerCase().trim()
  const { data, error } = await supabase
    .from('admin_registration_requests')
    .select('*')
    .ilike('email', normalized)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && isMissingRelation(error)) return null
  if (error) throw error
  return data
}

export async function insertAdminRegistrationRequest({
  full_name,
  email,
  password_hash,
  phone,
  organization_name,
  message,
}) {
  const payload = {
    full_name: full_name.trim(),
    email: email.toLowerCase().trim(),
    password_hash,
    phone: phone.trim(),
    organization_name: organization_name?.trim() || null,
    message: message?.trim() || null,
    status: 'pending',
  }

  const { data, error } = await supabase
    .from('admin_registration_requests')
    .insert(payload)
    .select('id, email, status, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A pending registration already exists for this email')
    }
    if (isMissingRelation(error)) {
      throw new Error(
        'Admin registration table missing. Run supabase/017_admin_registration_requests.sql in Supabase.'
      )
    }
    throw error
  }

  return data
}

export async function listAdminRegistrationRequests({ status } = {}) {
  let q = supabase
    .from('admin_registration_requests')
    .select(
      'id, full_name, email, phone, organization_name, message, status, rejection_reason, reviewed_at, created_at, created_user_id'
    )
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error && isMissingRelation(error)) return []
  if (error) throw error
  return data || []
}

export async function getAdminRegistrationRequestById(id) {
  const { data, error } = await supabase
    .from('admin_registration_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateAdminRegistrationRequest(id, patch) {
  const { data, error } = await supabase
    .from('admin_registration_requests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

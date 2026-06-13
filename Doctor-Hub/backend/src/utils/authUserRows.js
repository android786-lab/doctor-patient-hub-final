import supabase from '../config/supabase.js'
import { resolveDoctorRowId } from './assistantRows.js'

function placeholderAvatarUrl(full_name) {
  const n = encodeURIComponent((full_name || 'User').trim() || 'User')
  return `https://ui-avatars.com/api/?name=${n}&background=0d9488&color=fff&size=128&bold=true`
}

const BLANK_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAACXBIWXMAABCcAAAQnAEmzTo0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADASURBVHgB7cExAQAAAMKg9U9tCy+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBuAABHgAAAABJRU5ErkJggg=='

function sanitizeImage(image, full_name) {
  if (!image || image === BLANK_PLACEHOLDER || (typeof image === 'string' && image.length < 250 && image.startsWith('data:'))) {
    return placeholderAvatarUrl(full_name)
  }
  return image
}

function isMissingColumnError(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|schema cache/i.test(msg)
}

function isForeignKeyError(err) {
  const msg = err?.message || ''
  return err?.code === '23503' || /foreign key|violates foreign key/i.test(msg)
}

export async function insertUser({ email, password, role, full_name, phone, image }) {
  const normalizedEmail = email.toLowerCase().trim()
  const avatar = image || placeholderAvatarUrl(full_name)

  const attempts = [
    {
      name: full_name,
      email: normalizedEmail,
      password,
      role,
      phone: phone || null,
      image: avatar,
      is_active: true,
    },
    {
      email: normalizedEmail,
      password,
      role,
      is_active: true,
    },
    {
      email: normalizedEmail,
      password,
      role,
    },
    {
      name: full_name,
      email: normalizedEmail,
      password,
      image: placeholderAvatarUrl(full_name),
      phone: phone || '000000000',
      address: { line1: '', line2: '' },
      gender: 'Not Selected',
      dob: 'Not Selected',
    },
  ]

  let lastError = null
  for (const payload of attempts) {
    const { data, error } = await supabase
      .from('users')
      .insert(payload)
      .select('id, email, role, name')
      .single()

    if (!error) {
      return {
        id: data.id,
        email: data.email,
        role: data.role || role,
        name: data.name || full_name,
      }
    }
    lastError = error
    if (!isMissingColumnError(error)) break
  }

  throw lastError || new Error('Failed to create user')
}

/** Display name for navbar — never prefers email over real name. */
export async function resolveUserDisplay(userRow) {
  if (!userRow?.id) {
    return { name: 'User', image: null, email: userRow?.email || null }
  }

  let name = (userRow.name || userRow.full_name || '').trim()
  let image = sanitizeImage(userRow.image, userRow.name || userRow.full_name)

  if (!name) {
    const { data: patient } = await supabase
      .from('patients')
      .select('full_name')
      .eq('user_id', userRow.id)
      .maybeSingle()
    name = (patient?.full_name || '').trim()
  }

  if (!name) {
    const { data: u } = await supabase
      .from('users')
      .select('name, image')
      .eq('id', userRow.id)
      .maybeSingle()
    name = (u?.name || '').trim()
    image = sanitizeImage(u?.image || image, name)
  }

  return {
    name: name || 'User',
    image: sanitizeImage(image, name),
    email: userRow.email || null,
  }
}

export async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, password, role, is_active, name')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!error && data) return data

  if (isMissingColumnError(error)) {
    const fallback = await supabase
      .from('users')
      .select('id, email, password, name, image, role, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (fallback.error) throw fallback.error
    return fallback.data
      ? { ...fallback.data, role: fallback.data.role || 'patient', is_active: true }
      : null
  }

  if (error) throw error
  return null
}

/**
 * Creates patients row when schema allows (user_id → users.id).
 * Returns { ok: true } or { ok: false, skipped: true } — skipped is not fatal.
 */
export async function insertPatientProfile({ user_id, full_name, phone }) {
  const attempts = [
    { user_id, full_name, phone },
    { user_id, full_name },
    { user_id },
  ]

  for (const payload of attempts) {
    const { error } = await supabase.from('patients').insert(payload)
    if (!error) return { ok: true }

    if (isForeignKeyError(error)) {
      console.warn(
        'Could not complete registration. Please try again or contact support.'
      )
      return { ok: false, skipped: true, reason: 'fk_profiles_not_users' }
    }

    if (
      isMissingColumnError(error) ||
      /relation.*does not exist/i.test(error.message || '')
    ) {
      return { ok: false, skipped: true, reason: 'no_patients_table' }
    }

    throw error
  }

  return { ok: false, skipped: true }
}

const ASSISTANTS_FK_HINT =
  'Could not create assistant. Please try again or contact hospital administration.'

/**
 * Links assistant user to a doctor row. Requires assistants.user_id → public.users (023 migration).
 */
export async function insertAssistantAssignment(userId, doctorId) {
  if (!doctorId) return { ok: true }

  const doctorRowId = await resolveDoctorRowId(doctorId)
  if (!doctorRowId) {
    throw new Error('Doctor not found — select a valid doctor from the list')
  }

  const payloads = [
    { user_id: userId, doctor_id: doctorRowId },
    { user_id: userId, doctor_id: doctorRowId, full_name: null },
  ]

  for (const payload of payloads) {
    const { error } = await supabase.from('assistants').insert(payload)
    if (!error) return { ok: true }

    if (isForeignKeyError(error)) {
      const err = new Error(ASSISTANTS_FK_HINT)
      err.code = 'assistants_user_id_fkey'
      throw err
    }

    if (!isMissingColumnError(error)) throw error
  }

  return { ok: true }
}

export async function upsertAssistantAssignment(userId, doctorId) {
  if (!doctorId) return { ok: true }

  const doctorRowId = await resolveDoctorRowId(doctorId)
  if (!doctorRowId) {
    throw new Error('Doctor not found — select a valid doctor from the list')
  }

  const { data: existing } = await supabase
    .from('assistants')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing?.id) {
    const email = (
      await supabase.from('users').select('email').eq('id', userId).maybeSingle()
    ).data?.email
    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()
      if (profile?.id && profile.id !== userId) {
        const { data: byProfile } = await supabase
          .from('assistants')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle()
        if (byProfile?.id) {
          await supabase
            .from('assistants')
            .update({ user_id: userId, doctor_id: doctorRowId })
            .eq('id', byProfile.id)
          return { ok: true }
        }
      }
    }
  }

  if (existing?.id) {
    const { error } = await supabase
      .from('assistants')
      .update({ doctor_id: doctorRowId })
      .eq('user_id', userId)
    if (error) {
      if (isForeignKeyError(error)) {
        const err = new Error(ASSISTANTS_FK_HINT)
        err.code = 'assistants_user_id_fkey'
        throw err
      }
      throw error
    }
    return { ok: true }
  }

  return insertAssistantAssignment(userId, doctorRowId)
}

async function insertAssistantViaProfiles({
  email,
  plainPassword,
  passwordHash,
  full_name,
  phone,
  doctorId,
}) {
  const normalizedEmail = email.toLowerCase().trim()

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: plainPassword,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authErr) {
    if (/already|exists|registered/i.test(authErr.message || '')) {
      throw new Error('Email already registered')
    }
    return null
  }

  const uid = authData.user.id

  const profileAttempts = [
    { id: uid, email: normalizedEmail, full_name, role: 'assistant', phone: phone || null },
    { id: uid, email: normalizedEmail, full_name, role: 'assistant' },
  ]

  let profileOk = false
  for (const profile of profileAttempts) {
    const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' })
    if (!error) {
      profileOk = true
      break
    }
    if (!isMissingColumnError(error)) {
      await supabase.auth.admin.deleteUser(uid)
      throw error
    }
  }

  if (!profileOk) {
    await supabase.auth.admin.deleteUser(uid)
    return null
  }

  const storedPassword = passwordHash || plainPassword
  const userAttempts = [
    {
      id: uid,
      name: full_name,
      email: normalizedEmail,
      password: storedPassword,
      role: 'assistant',
      phone: phone || null,
      is_active: true,
    },
    { id: uid, email: normalizedEmail, password: storedPassword, role: 'assistant', is_active: true },
  ]

  for (const payload of userAttempts) {
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
    if (!error) break
    if (!isMissingColumnError(error)) {
      await supabase.auth.admin.deleteUser(uid)
      throw error
    }
  }

  if (doctorId) {
    const doctorRowId = await resolveDoctorRowId(doctorId)
    const { error } = await supabase.from('assistants').insert({
      user_id: uid,
      doctor_id: doctorRowId || doctorId,
    })
    if (error) {
      await supabase.auth.admin.deleteUser(uid)
      throw error
    }
  }

  return {
    id: uid,
    email: normalizedEmail,
    role: 'assistant',
    name: full_name,
  }
}

/**
 * Create assistant in public.users and optionally assign to doctor.
 * Falls back to Supabase Auth + profiles when DB still uses profiles FK.
 */
export async function createAssistantAccount({
  email,
  password,
  full_name,
  phone,
  doctorId,
  passwordHash,
  image,
}) {
  const normalizedEmail = email.toLowerCase().trim()
  const plainPassword = password
  const hashedPassword = passwordHash || password

  const user = await insertUser({
    email: normalizedEmail,
    password: hashedPassword,
    role: 'assistant',
    full_name,
    phone,
    image,
  })

  try {
    if (doctorId) await insertAssistantAssignment(user.id, doctorId)
    return user
  } catch (err) {
    await supabase.from('users').delete().eq('id', user.id)

    if (err.code === 'assistants_user_id_fkey' && plainPassword) {
      const viaProfiles = await insertAssistantViaProfiles({
        email: normalizedEmail,
        plainPassword,
        passwordHash: hashedPassword,
        full_name,
        phone,
        doctorId,
      })
      if (viaProfiles) return viaProfiles
    }

    throw err
  }
}

export async function insertDoctorProfile({ user_id, full_name, phone }) {
  const attempts = [
    { user_id, full_name, phone },
    { user_id, full_name },
    { user_id },
  ]

  for (const payload of attempts) {
    const { error } = await supabase.from('doctors').insert(payload)
    if (!error) {
      await supabase.from('users').update({ role: 'doctor' }).eq('id', user_id)
      return { ok: true }
    }

    if (isForeignKeyError(error) || isMissingColumnError(error)) {
      return { ok: false, skipped: true }
    }

    if (/relation.*does not exist/i.test(error.message || '')) {
      return { ok: false, skipped: true }
    }

    throw error
  }

  return { ok: false, skipped: true }
}

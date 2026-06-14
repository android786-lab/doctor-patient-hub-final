import supabase from '../config/supabase.js'
import { resolveDoctorContextIdsOrCreate } from './appointmentDoctorRows.js'
import { loadProfiles, mapLegacyDoctorCard } from './doctorRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function missingColumnName(err) {
  const msg = err?.message || ''
  const patterns = [
    /Could not find the '(\w+)' column of 'doctors'/i,
    /doctors\.(\w+) does not exist/i,
    /column "(\w+)" of relation "doctors"/i,
    /'(\w+)' column of 'doctors'/i,
  ]
  for (const re of patterns) {
    const m = msg.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

/** Update doctors row, dropping columns that are absent in this Supabase schema. */
async function updateDoctorRowResilient(doctorRowId, patch) {
  const attempt = { ...patch }
  let lastError = null

  for (let i = 0; i < 12 && Object.keys(attempt).length > 0; i++) {
    const { error } = await supabase.from('doctors').update(attempt).eq('id', doctorRowId)
    if (!error) return
    lastError = error
    if (!isMissingColumn(error)) throw error
    const col = missingColumnName(error)
    if (!col || !(col in attempt)) break
    delete attempt[col]
  }

  if (Object.keys(attempt).length > 0 && lastError) {
    throw lastError
  }
}

function normalizeAddress(addr) {
  if (!addr) return { line1: '', line2: '' }
  if (typeof addr === 'object' && (addr.line1 !== undefined || addr.line2 !== undefined)) {
    return { line1: addr.line1 || '', line2: addr.line2 || '' }
  }
  if (typeof addr === 'string') return { line1: addr, line2: '' }
  return { line1: '', line2: '' }
}

const SELECT_ATTEMPTS = [
  `id, user_id, full_name, email, name, image, profile_image, speciality, specialization,
   degree, experience, experience_years, about, bio, is_active, fees,
   consultation_fee, address, date, is_verified`,
  'id, user_id, full_name, specialization, bio, consultation_fee, experience_years, profile_image, is_active, is_verified, address',
  'id, user_id, full_name, specialization, bio, consultation_fee, experience_years, is_verified',
  '*',
]

export async function fetchDoctorProfileForUi(contextUserId) {
  const { doctorRowId, userId } = await resolveDoctorContextIdsOrCreate(contextUserId)

  let row = null
  for (const columns of SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from('doctors')
      .select(columns)
      .eq('id', doctorRowId)
      .maybeSingle()

    if (!error && data) {
      row = data
      break
    }
    if (error && !isMissingColumn(error)) throw error
  }

  if (!row) throw new Error('Doctor profile not found')

  let profile = null
  if (row.user_id) {
    try {
      const profiles = await loadProfiles([row.user_id])
      profile = profiles[row.user_id] || null
    } catch {
      profile = null
    }
  }

  let email = row.email || null
  let phone = row.phone || null
  let address = normalizeAddress(row.address)

  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('email, name, image, phone, address')
      .eq('id', userId)
      .maybeSingle()
    if (user) {
      email = email || user.email
      phone = phone || user.phone
      if (!row.full_name && user.name) row.full_name = user.name
      if (!row.profile_image && user.image) row.profile_image = user.image
      const userAddr = normalizeAddress(user.address)
      if (!address.line1 && !address.line2 && (userAddr.line1 || userAddr.line2)) {
        address = userAddr
      }
    }
  }

  if (profile?.phone && !phone) phone = profile.phone

  const legacy = mapLegacyDoctorCard(row, profile)
  const diseases = Array.isArray(row.diseases) ? row.diseases : []

  return {
    id: row.id,
    name: legacy.name,
    email: email || profile?.email || '',
    phone: phone && phone !== '000000000' ? phone : '',
    image: legacy.image,
    speciality: legacy.speciality,
    degree: row.degree || legacy.degree,
    experience: legacy.experience,
    experience_years: row.experience_years ?? null,
    about: legacy.about,
    fees: legacy.fees,
    available: legacy.available,
    address,
    treatment_type: row.treatment_type || 'allopathic',
    diseases,
    slots_booked: row.slots_booked || {},
    date: legacy.date,
    is_verified: legacy.is_verified === true,
  }
}

export async function saveDoctorProfileModule(
  contextUserId,
  {
    specialization,
    treatment_type,
    treatmentType,
    experience,
    experience_years,
    fee,
    fees,
    bio,
    about,
    phone,
    available,
    address,
  }
) {
  const { doctorRowId, userId } = await resolveDoctorContextIdsOrCreate(contextUserId)
  const treatment = treatment_type || treatmentType
  const feeVal = fee ?? fees
  const bioVal = bio ?? about
  const expYears =
    experience_years ??
    (experience != null ? parseInt(String(experience).match(/\d+/)?.[0] || '0', 10) : undefined)

  const patch = {}
  if (specialization !== undefined) {
    patch.specialization = String(specialization).trim()
    patch.speciality = patch.specialization
  }
  if (treatment !== undefined) patch.treatment_type = treatment
  if (bioVal !== undefined) {
    patch.bio = bioVal
    patch.about = bioVal
  }
  if (feeVal !== undefined) {
    patch.consultation_fee = Number(feeVal) || 0
    patch.fees = Number(feeVal) || 0
  }
  if (expYears !== undefined) {
    patch.experience_years = expYears
    patch.experience = `${expYears} years`
  } else if (experience !== undefined) {
    patch.experience = String(experience)
  }
  if (available !== undefined) {
    const on = available !== false
    patch.is_active = on
    patch.available = on
  }

  let lastError = null
  if (Object.keys(patch).length) {
    try {
      await updateDoctorRowResilient(doctorRowId, patch)
    } catch (err) {
      lastError = err
      if (!isMissingColumn(err)) throw err
    }
  }

  if (Object.keys(patch).length && lastError) {
    throw lastError
  }

  if (address !== undefined) {
    const addr = normalizeAddress(address)
    const addrAttempts = [{ address: addr }, { address: JSON.stringify(addr) }]
    for (const ap of addrAttempts) {
      const { error } = await supabase.from('doctors').update(ap).eq('id', doctorRowId)
      if (!error) break
      if (!isMissingColumn(error)) throw error
    }
  }

  if (userId && (phone !== undefined || address !== undefined)) {
    const userPatch = {}
    if (phone !== undefined) userPatch.phone = phone
    if (address !== undefined) userPatch.address = normalizeAddress(address)
    const { error: userErr } = await supabase.from('users').update(userPatch).eq('id', userId)
    if (userErr && !isMissingColumn(userErr)) throw userErr
  }

  return fetchDoctorProfileForUi(contextUserId)
}

export async function updateDoctorProfileForUi(
  contextUserId,
  { fees, address, available, about, phone, specialization, treatment_type, experience, bio }
) {
  if (
    specialization !== undefined ||
    treatment_type !== undefined ||
    experience !== undefined ||
    bio !== undefined
  ) {
    return saveDoctorProfileModule(contextUserId, {
      specialization,
      treatment_type,
      experience,
      fees,
      bio,
      about: about ?? bio,
      phone,
      available,
      address,
    })
  }
  const { doctorRowId, userId } = await resolveDoctorContextIdsOrCreate(contextUserId)

  const carelinkPatch = {}
  const modulePatch = {}
  if (fees !== undefined) carelinkPatch.fees = Number(fees)
  if (about !== undefined) carelinkPatch.about = about
  if (available !== undefined) {
    const on = available !== false
    carelinkPatch.available = on
    modulePatch.is_active = on
  }
  if (address !== undefined) carelinkPatch.address = normalizeAddress(address)

  if (fees !== undefined) modulePatch.consultation_fee = Number(fees)
  if (about !== undefined) modulePatch.bio = about
  const attempts = [carelinkPatch, modulePatch, { ...carelinkPatch, ...modulePatch }].filter(
    (p) => Object.keys(p).length > 0
  )

  let lastError = null
  let doctorsUpdated = false
  for (const patch of attempts) {
    try {
      await updateDoctorRowResilient(doctorRowId, patch)
      doctorsUpdated = true
      break
    } catch (err) {
      lastError = err
      if (!isMissingColumn(err)) throw err
    }
  }

  if (!doctorsUpdated && attempts.length) {
    throw lastError || new Error('Could not update profile')
  }

  if (userId && (address !== undefined || phone !== undefined)) {
    const userPatch = {}
    if (address !== undefined) userPatch.address = normalizeAddress(address)
    if (phone !== undefined) userPatch.phone = phone
    const { error: userErr } = await supabase.from('users').update(userPatch).eq('id', userId)
    if (userErr && !isMissingColumn(userErr)) throw userErr
  }
}

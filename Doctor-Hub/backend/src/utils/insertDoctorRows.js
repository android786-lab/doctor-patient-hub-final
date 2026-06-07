import supabase from '../config/supabase.js'
import { insertUser } from './authUserRows.js'

function isMissingColumn(err) {
  const msg = err?.message || ''
  return err?.code === 'PGRST204' || /column|does not exist|schema cache/i.test(msg)
}

function isForeignKeyError(err) {
  const msg = err?.message || ''
  return err?.code === '23503' || /foreign key|violates foreign key/i.test(msg)
}

function parseExperienceYears(experience) {
  const match = String(experience || '').match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

function stripKeys(obj, keys) {
  const next = { ...obj }
  for (const k of keys) next[k] = undefined
  return Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined))
}

async function syncDoctorUserMeta(userId, { name, imageUrl, address, phone }) {
  if (!userId) return
  const attempts = [
    {
      name,
      image: imageUrl,
      address: address || { line1: '', line2: '' },
      phone: phone || '000000000',
    },
    { name, image: imageUrl, address: address || { line1: '', line2: '' } },
    { name },
  ]
  for (const patch of attempts) {
    const { error } = await supabase.from('users').update(patch).eq('id', userId)
    if (!error) return
    if (!isMissingColumn(error)) break
  }
}

async function insertDoctorViaProfiles({
  name,
  email,
  plainPassword,
  speciality,
  about,
  fees,
  treatmentType,
  diseases,
  imageUrl,
  experience,
}) {
  const normalizedEmail = email.toLowerCase().trim()
  const diseaseList = diseases || []

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: plainPassword,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (authErr) {
    if (/already|exists|registered/i.test(authErr.message || '')) {
      throw new Error('Email already registered')
    }
    return null
  }

  const uid = authData.user.id

  const profileAttempts = [
    { id: uid, email: normalizedEmail, full_name: name, role: 'doctor', avatar_url: imageUrl },
    { id: uid, email: normalizedEmail, full_name: name, role: 'doctor' },
  ]

  let profileOk = false
  for (const profile of profileAttempts) {
    const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' })
    if (!error) {
      profileOk = true
      break
    }
    if (!isMissingColumn(error)) {
      await supabase.auth.admin.deleteUser(uid)
      throw error
    }
  }

  if (!profileOk) {
    await supabase.auth.admin.deleteUser(uid)
    return null
  }

  const doctorPayloads = [
    {
      user_id: uid,
      full_name: name,
      specialization: speciality,
      treatment_type: treatmentType || 'allopathic',
      diseases: diseaseList,
      bio: about || '',
      consultation_fee: Number(fees) || 0,
      experience_years: parseExperienceYears(experience),
      profile_image: imageUrl,
      is_verified: true,
      is_active: true,
    },
    {
      user_id: uid,
      specialization: speciality,
      treatment_type: treatmentType || 'allopathic',
      diseases: diseaseList,
      bio: about || '',
      consultation_fee: Number(fees) || 0,
      experience_years: parseExperienceYears(experience),
      is_verified: true,
    },
    {
      user_id: uid,
      specialization: speciality,
      bio: about || '',
      is_verified: true,
    },
  ]

  for (const payload of doctorPayloads) {
    const { error } = await supabase.from('doctors').insert(payload)
    if (!error) return { mode: 'profiles_auth' }
    if (!isMissingColumn(error)) {
      await supabase.auth.admin.deleteUser(uid)
      throw error
    }
  }

  await supabase.auth.admin.deleteUser(uid)
  return null
}

export async function insertDoctorFromAdmin({
  name,
  email,
  passwordHash,
  plainPassword,
  speciality,
  degree,
  experience,
  about,
  fees,
  address,
  treatmentType,
  diseases,
  imageUrl,
}) {
  const diseaseList = diseases || []
  const normalizedEmail = email.toLowerCase().trim()

  const carelinkFull = {
    name,
    email: normalizedEmail,
    password: passwordHash,
    image: imageUrl,
    speciality,
    degree: degree || '',
    experience: experience || '',
    about: about || '',
    fees: Number(fees) || 0,
    address: address || { line1: '', line2: '' },
    available: true,
    slots_booked: {},
    date: Date.now(),
    treatment_type: treatmentType || 'allopathic',
    diseases: diseaseList,
  }

  const carelinkAttempts = [
    stripKeys(carelinkFull, ['about']),
    stripKeys(carelinkFull, ['about', 'treatment_type', 'diseases']),
    carelinkFull,
    stripKeys(carelinkFull, ['treatment_type', 'diseases']),
    stripKeys(carelinkFull, ['about', 'degree', 'experience']),
    {
      name,
      email: normalizedEmail,
      password: passwordHash,
      image: imageUrl,
      speciality,
      fees: Number(fees) || 0,
      address: address || { line1: '', line2: '' },
      available: true,
      slots_booked: {},
      date: Date.now(),
    },
  ]

  for (const payload of carelinkAttempts) {
    const { error } = await supabase.from('doctors').insert(payload)
    if (!error) return { mode: 'carelink' }
    if (!isMissingColumn(error)) throw error
  }

  const user = await insertUser({
    email: normalizedEmail,
    password: passwordHash,
    role: 'doctor',
    full_name: name,
    phone: '000000000',
  })

  const doctorPayloads = [
    {
      user_id: user.id,
      full_name: name,
      specialization: speciality,
      treatment_type: treatmentType || 'allopathic',
      diseases: diseaseList,
      bio: about || '',
      consultation_fee: Number(fees) || 0,
      experience_years: parseExperienceYears(experience),
      profile_image: imageUrl,
      is_verified: true,
      is_active: true,
    },
    {
      user_id: user.id,
      full_name: name,
      specialization: speciality,
      bio: about || '',
      consultation_fee: Number(fees) || 0,
      is_verified: true,
    },
    {
      user_id: user.id,
      full_name: name,
      specialization: speciality,
      is_verified: true,
    },
  ]

  let fkToProfiles = false
  for (const payload of doctorPayloads) {
    const { error } = await supabase.from('doctors').insert(payload)
    if (!error) {
      await syncDoctorUserMeta(user.id, { name, imageUrl, address, phone: '000000000' })
      return { mode: 'module_users' }
    }
    if (isForeignKeyError(error)) {
      fkToProfiles = true
      break
    }
    if (!isMissingColumn(error)) {
      await supabase.from('users').delete().eq('id', user.id)
      throw error
    }
  }

  if (fkToProfiles) {
    await supabase.from('users').delete().eq('id', user.id)

    if (plainPassword) {
      const viaProfiles = await insertDoctorViaProfiles({
        name,
        email,
        plainPassword,
        speciality,
        about,
        fees,
        treatmentType,
        diseases: diseaseList,
        imageUrl,
        experience,
      })
      if (viaProfiles) return viaProfiles
    }

    throw new Error(
      'Supabase SQL Editor mein supabase/011_doctors_link_users.sql chalayein, phir dubara doctor add karein.'
    )
  }

  await supabase.from('users').delete().eq('id', user.id)
  throw new Error('Failed to save doctor — check doctors table columns in Supabase')
}

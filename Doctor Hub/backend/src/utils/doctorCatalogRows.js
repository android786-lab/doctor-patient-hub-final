import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import supabase from '../config/supabase.js'
import {
  DEFAULT_SPECIALITIES,
  DEFAULT_TREATMENT_TYPES,
  DEFAULT_DISEASES,
} from '../constants/doctorCatalogDefaults.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CATALOG_PATH = path.join(__dirname, '../../data/doctor-catalog.json')

function uniqSorted(list, keyFn = (x) => x) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const k = String(keyFn(item)).trim()
    if (!k) continue
    const lower = k.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(typeof item === 'object' && item !== null ? item : k)
  }
  return out.sort((a, b) =>
    String(keyFn(a)).localeCompare(String(keyFn(b)), undefined, { sensitivity: 'base' })
  )
}

function slugifyTreatment(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function labelFromSlug(slug) {
  return String(slug)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function loadExtras() {
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf8')
    const data = JSON.parse(raw)
    return {
      specialities: Array.isArray(data.specialities) ? data.specialities : [],
      treatmentTypes: Array.isArray(data.treatmentTypes) ? data.treatmentTypes : [],
      diseases: Array.isArray(data.diseases) ? data.diseases : [],
    }
  } catch {
    return { specialities: [], treatmentTypes: [], diseases: [] }
  }
}

async function saveExtras(extras) {
  await fs.writeFile(CATALOG_PATH, `${JSON.stringify(extras, null, 2)}\n`, 'utf8')
}

async function fetchDistinctFromDoctors() {
  const { data: rows, error } = await supabase
    .from('doctors')
    .select('specialization, speciality, treatment_type, diseases')

  if (error) {
    return { specialities: [], treatmentTypes: [], diseases: [] }
  }

  const specialities = []
  const treatmentTypes = []
  const diseases = []

  for (const row of rows || []) {
    const spec = row.specialization || row.speciality
    if (spec) specialities.push(String(spec).trim())
    if (row.treatment_type) {
      const v = String(row.treatment_type).trim().toLowerCase()
      treatmentTypes.push({ value: v, label: labelFromSlug(v) })
    }
    const list = Array.isArray(row.diseases) ? row.diseases : []
    for (const d of list) {
      if (d) diseases.push(String(d).trim().toLowerCase())
    }
  }

  return {
    specialities,
    treatmentTypes,
    diseases,
  }
}

export async function getDoctorCatalog() {
  const extras = await loadExtras()
  const fromDb = await fetchDistinctFromDoctors()

  const specialities = uniqSorted([
    ...DEFAULT_SPECIALITIES,
    ...extras.specialities,
    ...fromDb.specialities,
  ])

  const treatmentTypes = uniqSorted(
    [...DEFAULT_TREATMENT_TYPES, ...extras.treatmentTypes, ...fromDb.treatmentTypes],
    (t) => t.value
  )

  const diseases = uniqSorted([
    ...DEFAULT_DISEASES,
    ...extras.diseases,
    ...fromDb.diseases,
  ])

  return { specialities, treatmentTypes, diseases }
}

export async function addCatalogEntry(type, rawValue, rawLabel) {
  const value = String(rawValue || '').trim()
  if (!value) throw new Error('Value is required')

  const extras = await loadExtras()

  if (type === 'speciality') {
    extras.specialities = uniqSorted([...extras.specialities, value])
  } else if (type === 'treatment_type') {
    const slug = slugifyTreatment(value)
    if (!slug) throw new Error('Invalid treatment type')
    const label = String(rawLabel || labelFromSlug(slug)).trim()
    extras.treatmentTypes = uniqSorted(
      [...extras.treatmentTypes, { value: slug, label }],
      (t) => t.value
    )
  } else if (type === 'disease') {
    extras.diseases = uniqSorted([...extras.diseases, value.toLowerCase()])
  } else {
    throw new Error('Unknown catalog type')
  }

  await saveExtras(extras)
  return getDoctorCatalog()
}

export const TABLE = 'doctors'

export const FIELDS = {
  id: 'UUID',
  user_id: 'UUID → users.id',
  specialization: 'TEXT',
  treatment_type: 'allopathic | homeopathic | herbal',
  experience_years: 'INT',
  experience: 'TEXT (legacy CareLink)',
  consultation_fee: 'NUMERIC',
  bio: 'TEXT',
  is_verified: 'BOOLEAN',
}

export const TREATMENT_TYPES = ['allopathic', 'homeopathic', 'herbal']

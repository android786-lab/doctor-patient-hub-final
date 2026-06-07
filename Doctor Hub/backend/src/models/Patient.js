export const TABLE = 'patients'

export const FIELDS = {
  id: 'UUID',
  user_id: 'UUID → users.id',
  full_name: 'TEXT',
  age: 'INT optional',
  blood_group: 'TEXT',
  medical_notes: 'TEXT',
  date_of_birth: 'DATE',
  phone: 'TEXT',
}

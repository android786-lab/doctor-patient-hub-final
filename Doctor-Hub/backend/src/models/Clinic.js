export const TABLE = 'clinics'

export const FIELDS = {
  id: 'UUID',
  doctor_id: 'UUID → doctors.id',
  name: 'TEXT',
  address: 'TEXT',
  city: 'TEXT',
  phone: 'TEXT',
  timings: 'JSONB (weekly schedule / hours)',
}

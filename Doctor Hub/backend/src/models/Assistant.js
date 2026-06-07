export const TABLE = 'assistants'

export const FIELDS = {
  id: 'UUID',
  user_id: 'UUID → users.id',
  doctor_id: 'UUID → doctors.id',
  full_name: 'TEXT optional',
  phone: 'TEXT optional',
}

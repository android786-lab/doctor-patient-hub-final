/**
 * Data layer reference for Doctor Hub (Supabase).
 * Prompt docs say /server/models with Sequelize — we use these schemas + supabase/*.sql instead of MySQL.
 */
export { TABLE as USERS_TABLE, FIELDS as UserFields, ROLES } from './User.js'
export { TABLE as DOCTORS_TABLE, FIELDS as DoctorFields, TREATMENT_TYPES } from './Doctor.js'
export { TABLE as PATIENTS_TABLE, FIELDS as PatientFields } from './Patient.js'
export { TABLE as ASSISTANTS_TABLE, FIELDS as AssistantFields } from './Assistant.js'
export { TABLE as CLINICS_TABLE, FIELDS as ClinicFields } from './Clinic.js'

# Doctor module — API & UI

Doctor portal runs in **`admin/`** (port 5174) after login as **doctor**.

## Supabase

Run `supabase/022_doctor_module.sql` (and `012` for weekly columns if needed).

## APIs (`/api/doctor/*`)

All require **JWT** + **doctor** role (`dtoken` or `token` header).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard` | Stats: total/today appointments, patients, pending payments |
| GET/POST/PUT | `/profile` | View / create / update profile |
| POST | `/clinic` | Add clinic |
| GET | `/clinics` | List own clinics |
| GET/POST | `/schedule` | Weekly + date-specific slots |
| GET | `/appointments` | All bookings |
| GET | `/patients` | Patients who visited |

Legacy routes (`/api/doctor/update-profile`, `/api/clinics/my`) still work.

## UI routes

| Path | Page |
|------|------|
| `/doctor/dashboard` | Stats home |
| `/doctor/profile` | Profile setup |
| `/doctor/clinics` | Clinics |
| `/doctor/schedule` | Weekly + calendar slots |
| `/doctor/appointments` | Appointments table |
| `/doctor/patients` | Patient list |
| `/doctor/prescriptions` | Medical records (AddRecord) |

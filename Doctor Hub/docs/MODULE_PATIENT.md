# Patient module

## APIs (JWT + `patient` role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctors` | List verified doctors (`search`, `disease`, `type` / `treatment_type`, `city`) |
| GET | `/api/doctors/:id` | Doctor profile, clinics, weekly schedule |
| POST | `/api/appointments` | Book (`doctorId`, `clinicId`, `date`, `timeSlot`) |
| POST | `/api/payments` | Upload screenshot (`multipart`, field `screenshot`) |
| GET | `/api/patient/appointments` | Own appointments |
| GET | `/api/patient/history` | Medical history (read only) |
| GET | `/api/patient/prescriptions` | Prescriptions (read only) |

## Frontend routes

- `/patient/dashboard` — overview
- `/patient/find-doctors` — search & filters
- `/patient/doctor/:id` — profile & schedule
- `/patient/book/:docId` — 4-step booking + payment
- `/patient/appointments` — list with status badges
- `/patient/history` — timeline
- `/patient/prescriptions` — read-only list
- `/patient/profile` — profile

Sidebar: `PatientSidebar` + mobile nav on all portal routes.

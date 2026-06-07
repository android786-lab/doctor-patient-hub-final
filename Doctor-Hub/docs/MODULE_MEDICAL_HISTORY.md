# Medical history & prescriptions

## API

| Method | Path | Auth | Action |
|--------|------|------|--------|
| POST | `/api/history` | Doctor | Add record |
| POST | `/api/history/:historyId/prescriptions` | Doctor | Add prescriptions |
| GET | `/api/history/my` | Patient | Own timeline |
| GET | `/api/history/patient/:patientId` | Doctor | That doctor's records only |
| DELETE | `/api/history/:id` | Any | **403** always |
| DELETE | `/api/prescriptions/:id` | Any | **403** always |
| PATCH | `/api/prescriptions/:id` | Any | **403** always |

## UI

- Doctor: admin app → **Appointments** (`/doctor-appointments`)
- Patient: `/patient/history`

## SQL

If inserts fail, run `supabase/007_medical_history_module.sql`.

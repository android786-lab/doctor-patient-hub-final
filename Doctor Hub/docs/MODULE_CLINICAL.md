# Medical history & prescriptions

## Rules (enforced)

| Rule | Enforcement |
|------|-------------|
| Medical history never deleted | `DELETE` on `/api/history/:id` → 403; DB trigger |
| Prescriptions never edited | `PUT/PATCH/DELETE` on `/api/prescriptions` and `/api/doctor/prescription/:id` → 403; DB trigger |
| Only doctors add history | `POST /api/doctor/medical-history` (doctor JWT) |
| Patients read-only | `GET /api/patient/history` — no write routes |

## Doctor APIs

| Method | Path | Body |
|--------|------|------|
| POST | `/api/doctor/medical-history` | `patientId`, `appointmentId`, `symptoms`, `diagnosis`, `notes` |
| GET | `/api/doctor/medical-history/:patientId` | Timeline for patient |
| POST | `/api/doctor/prescription` | `patientId`, `appointmentId`, `medicalHistoryId`, `medicines[]`, `instructions` |
| GET | `/api/doctor/prescriptions/:patientId` | List prescriptions |

Appointment must belong to the doctor. Prescriptions only for **confirmed** or **completed** appointments. Duplicate prescription per visit returns `409`.

## Doctor UI (`admin/`)

- **Medical records** (`/doctor/prescriptions`) — two-step: medical record → prescription (with immutability warning)
- **Patient history** (`/doctor/patients/:patientId/history`) — timeline with prescriptions & PDF download

Legacy routes remain: `POST /api/history`, `POST /api/history/:id/prescriptions`.

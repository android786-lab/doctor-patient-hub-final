# Assistant module

Each assistant is linked to **one doctor** via `assistants.doctor_id`.

## APIs (JWT + `assistant` role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assistant/pending-payments` | Pending payment proofs for assigned doctor |
| PUT | `/api/assistant/payments/:id/verify` | Verify payment → appointment `confirmed` |
| PUT | `/api/assistant/payments/:id/reject` | Reject with `{ reason }` in body |
| GET | `/api/assistant/appointments` | All appointments for assigned doctor |
| GET | `/api/assistant/bookings` | Bookings with payment metadata |

`:id` may be a **payment** UUID or **appointment** UUID (fallback).

Legacy: `GET /dashboard`, `POST /payments/confirm`, `GET /payments/verification`.

## Admin UI (`admin/`)

- `/assistant/dashboard` — stats: pending payments, today’s appointments, confirmed today
- `/assistant/pending-payments` — table, verify/reject with confirmation modals
- `/assistant/appointments` — full status list
- `/assistant/bookings` — cards with payment screenshot links

# Seven feature phases — setup & testing

Run migration **020** in Supabase SQL Editor before testing:

`supabase/020_password_reset_and_reports.sql`

Copy new env vars from `backend/.env.example` into `backend/.env`.

## Phase 1 — Forgot password

- **API:** `POST /api/auth/forgot-password` (sends 6-digit OTP, 10 min), `POST /api/auth/verify-otp`, `POST /api/auth/reset-password`, `GET /api/auth/reset-password/validate?reset_token=`
- **UI:** `/auth/forgot-password` (email → OTP), `/auth/reset-password` (new password after OTP)
- **SMTP:** set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Without SMTP, dev mode logs the reset URL in the backend console.

## Phase 2 — Patient lab/report upload

- **API:** `POST /api/history/my/reports` (multipart: `title`, `description`, `files[]`)
- **UI:** Patient → Medical history → Upload lab report
- Files stored in `medical_history.attachments` with `record_type = patient_report`

## Phase 3 — Doctor views patient history

- **API:** `GET /api/history/appointment/:appointmentId`
- **UI:** Doctor portal → Appointments & medical records → **View history** per appointment

## Phase 4 — E-prescription PDF

- **API:** `GET /api/history/:historyId/prescription.pdf` (auth required)
- **UI:** Download link on patient history and doctor history panel (doctor visits only)

## Phase 5 — WhatsApp notifications

- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- **Triggers:** manual payment proof submitted; appointment confirmed after verification
- Without Twilio, messages are logged to the backend console and `notifications_log` when available.

## Phase 6 — Validation middleware

- **File:** `backend/src/middleware/validate.js`
- Applied to: register, login, forgot/reset password, patient report upload, create assistant, assign assistant

## Phase 7 — Add assistant user

- **API:** `POST /api/admin/assistants` (admin + super_admin)
- **UI:** Admin sidebar → **Add assistant** (`/add-assistant`)

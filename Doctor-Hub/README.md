# Doctor Hub

**A full-stack healthcare platform for booking doctor appointments, verifying payments, and managing immutable medical records with role-based access control.**

Doctor Hub connects **patients**, **doctors**, **assistants**, and **hospital administrators** through separate web portals backed by a unified Node.js API and Supabase PostgreSQL database.

---

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| **Patient & staff UI** | React 18, Vite, Tailwind CSS, React Router |
| **Backend API** | Node.js, Express.js, express-validator |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | JWT (Bearer + httpOnly cookie), bcrypt password hashing |
| **File storage** | Cloudinary (profile/doctor images), local uploads (payment screenshots) |
| **Payments** | Manual bank-transfer verification, Stripe (optional) |
| **Deployment** | Vercel (three apps: patient, staff, API) — see `DEPLOYMENT.md` |

---

## User Roles

| Role | Description |
|------|-------------|
| **Patient** | Registers on the patient portal, searches doctors, books appointments, uploads payment proof, views medical history and prescriptions. |
| **Doctor** | Registers on the staff portal, manages clinics/schedules, conducts consultations (chat/video), adds medical history and prescriptions. |
| **Assistant** | Assigned to a doctor; verifies or rejects manual payment proofs and manages day-to-day appointment workflow. |
| **Admin** | Hospital administrator — manages doctors, patients, appointments, analytics, and assistant accounts. |
| **Super Admin** | Platform owner — approves admin registrations, manages all users, and accesses super-admin analytics. |

---

## Core Features

- **Doctor search & discovery** — filter by disease, speciality, treatment type (allopathic / homeopathic / herbal), and city
- **Appointment booking** — date/time slot selection against doctor schedules
- **Payment verification** — patients upload proof; assistants/admins verify or reject before confirmation
- **Medical history immutability** — append-only records; enforced at API and PostgreSQL trigger level
- **Role-based access control (RBAC)** — JWT role claims gate every protected route (`patient`, `doctor`, `assistant`, `admin`, `super_admin`)
- **OTP password reset** — 6-digit email OTP with 10-minute expiry
- **In-app appointment chat** — messaging between patient and doctor during confirmed visits
- **Admin analytics** — dashboard with appointment and revenue metrics

---

## Appointment Workflow

1. **Search** — Patient finds a verified doctor by disease, speciality, or location on the patient portal.
2. **Book** — Patient selects an available date/time slot and submits symptoms or disease query.
3. **Pay** — Patient pays via Stripe checkout or uploads a manual payment screenshot (JazzCash/EasyPaisa/bank transfer).
4. **Verify** — Assistant or admin reviews the payment proof and approves or rejects it.
5. **Confirm** — On approval, appointment status becomes `confirmed`; patient and doctor receive notifications (email / WhatsApp when configured).
6. **Consult & complete** — Doctor conducts the visit (chat and/or WebRTC video), adds medical history and prescription, then marks the appointment complete.

---

## Medical History Rules

Medical and prescription data follows strict **append-only / immutable** policies:

- **Medical history is immutable** — once created, records cannot be edited or deleted
- **No DELETE** on `medical_history` — blocked by API (403) and PostgreSQL trigger (`027_immutability_triggers.sql`)
- **No UPDATE or DELETE** on `prescriptions` — prescriptions are locked after creation
- **Add-only workflow** — doctors create new history entries and prescriptions per visit; patients may upload lab reports to their own timeline
- **Audit integrity** — ensures a tamper-evident clinical record suitable for healthcare compliance discussions

---

## How to Run Locally

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Doctor-Hub
```

### 2. Install dependencies

From the project root (npm workspaces):

```bash
npm install
```

Or install each app separately:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
```

### 3. Environment variables

#### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Long random string for signing JWTs |
| `SUPABASE_URL` | **Yes** | Supabase project URL |
| `SUPABASE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service role key |
| `FRONTEND_URL` | **Yes** | Patient app URL (e.g. `http://localhost:5173`) |
| `ADMIN_URL` | **Yes** | Staff portal URL (e.g. `http://localhost:5174`) |
| `PORT` | No | API port (default `4000`) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | No | Email for OTP password reset |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_SECRET_KEY` | No | Image uploads |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | No | Card payments |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | No | WhatsApp notifications |

#### Patient frontend (`frontend/.env`)

Copy `frontend/.env.example`:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000/api
VITE_ADMIN_URL=http://localhost:5174
```

#### Staff portal (`admin/.env`)

Copy `admin/.env.example`:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_API_URL=http://localhost:4000/api
VITE_FRONTEND_URL=http://localhost:5173
VITE_ADMIN_URL=http://localhost:5174
```

### 4. Run Supabase migrations

In the [Supabase SQL Editor](https://supabase.com/dashboard), run scripts in order (see `supabase/APPLY_MIGRATIONS.md`):

1. `backend/src/config/createTables.sql` — core 9-table schema
2. `supabase/016_appointment_messages.sql` — appointment chat
3. `supabase/017_admin_registration_requests.sql` — admin onboarding
4. `supabase/020_password_reset_and_reports.sql` — OTP reset, attachments, PDF cache
5. `supabase/027_immutability_triggers.sql` — DB-level immutability triggers
6. Additional migrations as needed (`021`–`029` for doctor module, notifications, OTP table, etc.)

### 5. Start all applications

From project root:

```bash
npm run dev
```

| Application | URL | Port |
|-------------|-----|------|
| Patient portal | http://localhost:5173 | 5173 |
| Staff portal (doctor / admin / assistant) | http://localhost:5174 | 5174 |
| REST API | http://localhost:4000 | 4000 |

**Quick demo flow:** Register a patient on `:5173` → register a doctor on `:5174/register-doctor` → admin verifies doctor → book appointment → upload payment → assistant verifies → confirmed.

---

## API Endpoints

Base URL: `http://localhost:4000/api`

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| **Authentication** |
| POST | `/auth/register` | Register patient account | No |
| POST | `/auth/login` | Unified login (all roles); returns JWT | No |
| POST | `/auth/logout` | Clear httpOnly session cookie | No |
| GET | `/auth/me` | Current user profile | JWT |
| GET | `/auth/staff-session` | Restore staff session from cookie | JWT |
| POST | `/auth/forgot-password` | Send 6-digit OTP email | No |
| POST | `/auth/verify-otp` | Verify OTP → short-lived reset token | No |
| POST | `/auth/reset-password` | Set new password | Reset token |
| POST | `/auth/register-admin` | Request admin account (super admin approval) | No |
| PATCH | `/auth/profile` | Update profile / photo | JWT |
| **Doctors (public & doctor)** |
| GET | `/doctors` | Search/list doctors | No |
| GET | `/doctors/:id` | Doctor public profile | No |
| GET | `/doctors/:id/available-slots` | Available booking slots | No |
| POST | `/doctors` | Admin adds doctor (multipart) | Admin JWT |
| **Patient portal** |
| GET | `/patient/appointments` | Patient's appointments | Patient JWT |
| GET | `/patient/history` | Patient medical timeline | Patient JWT |
| **Appointments** |
| POST | `/appointments/book` | Book appointment | Patient JWT |
| GET | `/appointments/my` | My appointments | Patient JWT |
| POST | `/appointments/cancel` | Cancel appointment | Patient JWT |
| GET | `/appointments/chat/:id/messages` | Chat messages | Participant JWT |
| POST | `/appointments/chat/:id/messages` | Send chat message | Participant JWT |
| POST | `/appointments/chat/:id/video` | Create/join video room | Participant JWT |
| PATCH | `/appointments/:id/complete` | Mark appointment complete | Doctor JWT |
| **Payments** |
| POST | `/payments/manual` | Upload payment screenshot | Patient JWT |
| POST | `/payments/checkout` | Stripe checkout session | Patient JWT |
| **Assistant** |
| GET | `/assistant/pending-payments` | Payments awaiting verification | Assistant JWT |
| PUT | `/assistant/payments/:id/verify` | Approve payment → confirm appointment | Assistant JWT |
| PUT | `/assistant/payments/:id/reject` | Reject payment proof | Assistant JWT |
| GET | `/assistant/appointments` | Doctor's appointments (scoped) | Assistant JWT |
| **Doctor portal** |
| GET | `/doctor/dashboard` | Doctor dashboard stats | Doctor JWT |
| GET/POST | `/doctor/clinics`, `/doctor/schedule` | Clinic & schedule management | Doctor JWT |
| POST | `/doctor/medical-history` | Add medical history (append-only) | Doctor JWT |
| POST | `/doctor/prescription` | Create prescription (immutable) | Doctor JWT |
| **Admin** |
| GET | `/admin/doctors` | List all doctors | Admin JWT |
| GET | `/admin/patients` | List all patients | Admin JWT |
| GET | `/admin/appointments` | All appointments | Admin JWT |
| GET | `/admin/analytics` | Dashboard analytics | Admin JWT |
| PUT | `/admin/doctors/:id/verify` | Verify doctor for public listing | Admin JWT |
| POST | `/admin/assistants` | Create assistant account | Admin JWT |
| **Medical history & PDF** |
| GET | `/history/my` | Patient history timeline | Patient JWT |
| POST | `/history/my/reports` | Upload lab report | Patient JWT |
| GET | `/history/:historyId/prescription.pdf` | Download e-prescription PDF | JWT |
| **AI (bonus)** |
| POST | `/ai/predict-disease` | Symptom → disease suggestion | Patient JWT |

> Full route modules: `backend/src/routes/*`. Legacy `/api/user/*` and env-password login routes are **deprecated**; use `/api/auth/login` instead.

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| **Password hashing** | bcrypt (10 salt rounds) on registration and password reset |
| **JWT authentication** | Signed tokens with `{ id, email, role }`; httpOnly cookie + Bearer header |
| **Rate limiting** | 10 requests / 15 min on login, register, forgot-password, verify-otp |
| **Input validation** | express-validator on auth, bookings, payments, clinics, clinical APIs |
| **RBAC middleware** | `authMiddleware`, `authDoctor`, `authAdmin`, `authPatient`, `requireRoles` |
| **CORS allow-list** | Only `FRONTEND_URL`, `ADMIN_URL`, and localhost origins |
| **Security headers** | Helmet middleware on all responses |
| **Upload restrictions** | Payment screenshots: JPG/PNG only, max 5 MB |
| **Medical immutability (API)** | 403 on DELETE history; 403 on UPDATE/DELETE prescriptions |
| **Medical immutability (DB)** | PostgreSQL triggers in `027_immutability_triggers.sql` |
| **No URL token passing** | Staff login uses cookie + localStorage; JWT never in query strings |

---

## Phase 2 / Future Features (Bonus — Implemented)

These features extend the core semester requirements and are labeled as **bonus / future scope** for academic evaluation:

| Feature | Status | Notes |
|---------|--------|-------|
| **AI disease prediction** | Implemented | `POST /api/ai/predict-disease` — symptom-based condition suggestions before booking |
| **Video consultation (WebRTC)** | Implemented | Peer video during confirmed appointments via `/api/appointments/chat/:id/video` and WebRTC signaling |
| **WhatsApp notifications (Twilio)** | Implemented | Payment submitted & appointment confirmed events; logs to console when Twilio env is unset |
| **E-prescription PDF generation** | Implemented | `GET /api/history/:historyId/prescription.pdf` — downloadable PDF cache on prescriptions |

---

## Database Schema (9 Core Tables)

Defined in `backend/src/config/createTables.sql`:

| # | Table | Main columns |
|---|-------|----------------|
| 1 | **`users`** | `id`, `email`, `password`, `role`, `name`, `phone`, `is_active`, `created_at` |
| 2 | **`patients`** | `id`, `user_id`, `full_name`, `phone`, `date_of_birth`, `gender`, `address`, `blood_group`, `medical_notes` |
| 3 | **`doctors`** | `id`, `user_id`, `specialization`, `treatment_type`, `consultation_fee`, `experience_years`, `is_verified`, `profile_image` |
| 4 | **`assistants`** | `id`, `user_id`, `doctor_id`, `full_name`, `phone` |
| 5 | **`clinics`** | `id`, `doctor_id`, `name`, `address`, `city`, `phone`, `timings` (JSONB) |
| 6 | **`appointments`** | `id`, `patient_id`, `doctor_id`, `clinic_id`, `appointment_date`, `appointment_time`, `status`, `disease_description`, `created_at` |
| 7 | **`payments`** | `id`, `appointment_id`, `screenshot_url`, `status` (`pending` / `verified` / `rejected`), `verified_by`, `verified_at` |
| 8 | **`medical_history`** | `id`, `patient_id`, `doctor_id`, `appointment_id`, `diagnosis`, `notes`, `created_at` *(append-only)* |
| 9 | **`prescriptions`** | `id`, `medical_history_id`, `medicine_name`, `dosage`, `duration`, `instructions`, `created_at` *(immutable)* |

Additional tables (chat, notifications, schedules, admin registration) are created by migrations in `supabase/`.

---

## Project Structure

```
Doctor-Hub/
├── frontend/          Patient portal (React + Vite, port 5173)
├── admin/             Staff portal — doctor, assistant, admin (port 5174)
├── backend/           Express REST API (port 4000)
├── supabase/          SQL migrations and setup guides
├── docs/              Module checklists and feature documentation
└── DEPLOYMENT.md      Production deployment guide
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/MODULE_1.md` | Auth, registration, dashboards |
| `docs/MODULE_3.md` | JWT auth flow |
| `docs/PHASE_SECURITY.md` | Security controls |
| `docs/PHASE_FEATURES.md` | OTP reset, PDF, WhatsApp, validation |
| `supabase/APPLY_MIGRATIONS.md` | Migration order for Supabase |

---

## License

Academic project — Doctor Hub, Final Year Semester Project.

# Module 1 — Doctor Hub setup & auth (prompt audit)

| Documentation | This repo |
|---------------|-----------|
| `/server` | **`backend/`** |
| `/client` | **`frontend/`** |
| MySQL + Sequelize | **Supabase (PostgreSQL)** — see `backend/src/config/createTables.sql` + `supabase/*.sql` |
| `/server/models` | **`backend/src/models/`** (schema reference; not Sequelize ORM) |

Staff portal (doctor / admin / assistant): **`admin/`** on port **5174**.

## Prompt checklist

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Express server | ✅ | `backend/server.js`, port **4000** |
| 2 | Database connection | ✅ | `backend/src/config/supabase.js` — use `SUPABASE_URL` + `SUPABASE_KEY` |
| 3 | `.env` + JWT_SECRET | ✅ | `backend/.env.example` |
| 4 | Tables: users, doctors, patients, assistants, clinics | ✅ | `createTables.sql`, migrations `005`, `021` |
| 5 | `POST /api/auth/register` | ✅ | Roles: patient, doctor (+ staff via admin) |
| 6 | `POST /api/auth/login` | ✅ | Returns JWT + httpOnly cookie |
| 7 | `POST /api/auth/forgot-password` | ✅ | Real email when SMTP set; else dev log |
| 8 | `authMiddleware.js` | ✅ | `backend/src/middleware/authMiddleware.js` |
| 9 | `roleMiddleware.js` | ✅ | `backend/src/middleware/roleMiddleware.js` |
| 10 | React Register / Login / Forgot | ✅ | `frontend/src/pages/auth/*` |
| 11 | AuthContext + protected routes | ✅ | `AuthContext.jsx`, `ProtectedRoute.jsx` |
| 12 | JWT in localStorage | ✅ | On login via `AuthContext` |
| 13 | Role redirect after login | ✅ | Patient → `/patient/dashboard`; doctor/admin/assistant → admin app |

## Folder map (prompt → actual)

```
backend/                    ← server
  src/
    models/                 ← User, Doctor, Patient, Assistant, Clinic
    controllers/              ← authController, …
    routes/                   ← auth.js, …
    middleware/               ← authMiddleware, roleMiddleware, validate
frontend/                   ← client
  src/
    pages/auth/
    components/shared/
    context/AuthContext.jsx
```

## Supabase setup

1. Run `backend/src/config/createTables.sql` (or existing migrations in order).
2. Run `supabase/021_module1_schema_align.sql` for `users.name`, doctor fee/experience, `patients.medical_notes`.
3. Run `supabase/020_password_reset_and_reports.sql` if using password reset.

## Run

```bash
npm install
npm run dev
```

- Patient UI: http://localhost:5173  
- API: http://localhost:4000  
- Staff UI: http://localhost:5174  

## Auth API quick test

```http
POST /api/auth/register
{ "name": "Ali", "email": "...", "password": "...", "role": "patient", "phone": "+92300..." }

POST /api/auth/login
{ "email": "...", "password": "..." }
```

Role in JWT: `patient` | `doctor` | `assistant` | `admin` | `super_admin` (doc may say `superadmin` — middleware accepts both).

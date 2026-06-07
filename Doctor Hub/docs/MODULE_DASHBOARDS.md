# Role-based dashboards

## Routes

| Role | App | Path |
|------|-----|------|
| Patient | frontend (5173) | `/patient/dashboard` |
| Doctor | admin (5174) | `/doctor/dashboard` |
| Doctor clinics | admin | `/doctor/clinics` |
| Assistant | admin | `/assistant/dashboard` |
| Admin | admin | `/admin/dashboard` |
| Super admin | admin | `/superadmin/dashboard` |

## How to open each dashboard

Run: `npm run dev` (frontend **5173**, staff portal **5174**, API **4000**).

### 1. Patient
- URL: http://localhost:5173/auth/login  
- Register/login as **Patient** → auto goes to `/patient/dashboard`

### 2. Doctor
- **A)** Staff portal http://localhost:5174 → toggle **Doctor** → doctor email/password (CareLink `doctors` table)  
- **B)** Frontend login as user with `role = doctor` → redirects to doctor dashboard  
- Direct: http://localhost:5174/doctor/dashboard (after doctor login)

### 3. Admin (normal admin)
- **A)** Staff portal → **Admin** tab → `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env` (default `admin@doctorhub.com` / `admin123`)  
- **B)** Frontend login with `role = admin` in `users` table → http://localhost:5174/admin/dashboard  
- Direct: http://localhost:5174/admin/dashboard (with valid `aToken` in localStorage)

### 4. Assistant
- User must have `role = assistant` in `users` table (register as patient, then Super Admin changes role, or SQL below)  
- Login: http://localhost:5173/auth/login → redirects to **Assistant dashboard**  
- Direct: http://localhost:5174/assistant/dashboard

### 5. Super Admin
- User must have `role = super_admin` in `users` table  
- Login: http://localhost:5173/auth/login → **Super admin dashboard** (extra tabs: assign assistant, roles)  
- Direct: http://localhost:5174/superadmin/dashboard

### Set role in Supabase (SQL Editor)
```sql
UPDATE users SET role = 'assistant' WHERE email = 'your@email.com';
-- or
UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
-- or
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Logout tip: staff portal uses `aToken` / `dToken` — use **Logout** in navbar or clear site data before switching role.

## APIs

- `GET /api/appointments/my` — patient stats + recent
- `GET /api/appointments/doctor/dashboard` — doctor stats
- `GET/POST/PATCH /api/clinics/my|/|:id` — doctor clinics
- `GET /api/admin/assistant/dashboard` — assistant
- `GET /api/admin/doctors`, `/patients`, `PATCH .../verify`, `.../deactivate`
- `PATCH /api/admin/assistants/assign`, `PATCH /api/admin/users/:id/role` — super_admin

## SQL

Run `supabase/010_clinics_table.sql` if clinics table is missing.

# Admin & Super Admin modules

## Admin APIs (`JWT` + `admin` or `super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/doctors` | All doctors + `is_verified` |
| PUT | `/api/admin/doctors/:id/verify` | Verify doctor |
| PUT | `/api/admin/doctors/:id/unverify` | Unverify doctor |
| GET | `/api/admin/patients` | All patients |
| GET | `/api/admin/appointments` | All appointments (`?status=&date=`) |
| GET | `/api/admin/payments` | All payment records |
| GET | `/api/admin/analytics` | Totals, revenue, 7-day chart, treatment mix |

## Super Admin APIs (`JWT` + `super_admin` only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/superadmin/admins` | List admins |
| POST | `/api/superadmin/admins` | Promote user `{ email }` or `{ userId }` |
| PATCH | `/api/superadmin/admins/demote` | Demote admin `{ userId }` |
| DELETE | `/api/superadmin/users/:id` | Delete user (blocks if medical history exists) |

Medical history rows are **never** deleted.

## Admin UI (`admin/` port 5174)

**Admin sidebar:** Dashboard, Doctors, Patients, Appointments, Payments (+ verify payments, add doctor/assistant)

**Super Admin sidebar:** Dashboard (analytics + approvals), same admin pages, Admins, Delete users

Routes: `/admin/*`, `/superadmin/dashboard`, `/superadmin/admins`, `/superadmin/users`

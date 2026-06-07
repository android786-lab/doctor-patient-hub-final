# Phase: Security & UI polish

## Backend security

| Control | Implementation |
|---------|----------------|
| Input validation | `express-validator` on auth, bookings, payments, doctor clinical APIs; existing `validate.js` on other routes |
| HTTP headers | `helmet` in `server.js` |
| Auth brute force | `express-rate-limit` — 10 requests / 15 min on login, register, forgot/reset password |
| Payment uploads | JPG/PNG only, max **5MB**, saved under `backend/uploads/payments/`, served at `/uploads/...` |
| CORS | Allow-list: `FRONTEND_URL`, `ADMIN_URL`, localhost 5173/5174 only |
| JWT | `authMiddleware`, `authDoctor`, `authAdmin`, `authPatient` on protected routes |
| Immutable data | No DELETE on `medical_history`; no PUT/PATCH on `prescriptions` |

### Env

```env
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
API_PUBLIC_URL=http://localhost:4000
JWT_SECRET=long-random-string
```

## Frontend polish

- **404** — `NotFound` page (patient + admin apps)
- **403** — existing `Unauthorized` for wrong role
- **Toasts** — `react-toastify` on forms and API actions
- **Loaders** — shared `Loader` on admin analytics, payments, etc.
- **Confirm modals** — verify/reject payment, delete user (`src/lib/ui/ConfirmModal.jsx` in frontend/admin)
- **Responsive** — tables use `overflow-x-auto`, grids use `sm:`/`lg:` breakpoints

## Admin analytics (recharts)

- Stat cards: doctors, patients, **appointments today**, revenue
- Bar chart: appointments per day (7 days)
- Pie chart: treatment types

Endpoint: `GET /api/admin/analytics`

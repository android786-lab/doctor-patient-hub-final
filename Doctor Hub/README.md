# Doctor Hub

**Doctor Hub** is your project. **CareLink** in this repo is only a **reference** for how working appointment booking + Stripe + admin was built — we did **not** intend to ship a copy of CareLink.

## What you asked for vs what we fixed

| Your requirement | Implementation |
|------------------|----------------|
| Appointments working **like** CareLink | Same slot booking + Stripe flow (proven backend) |
| Documentation features | Disease filter, treatment types, assistant verification, medical history, AI check |
| UI **better** than CareLink | New Doctor Hub design (teal, DM Sans, cards, workflow section) |
| Frontend / backend separate | `frontend/` + `backend/` + `admin/` |

## Unified UI (same look everywhere)

All React apps use **one theme** from `shared/ui/`:

- `styles.css` — fonts, `.dh-btn`, `.dh-card`, `.dh-input`, `.dh-hero`, etc.
- `tailwind.preset.js` — teal colors, shadows
- `BrandLogo.jsx`, `PageHeader.jsx` — `import X from '@doctor-hub/ui/...'`

| App | Port |
|-----|------|
| `frontend/` (patient) | 5173 |
| `admin/` (staff) | 5174 |

**Module 1** is implemented on `frontend/` + `backend/` + `admin/` (see `docs/MODULE_1.md`). Do not use separate `client/` / `server/` copies.

**Module 2** database: run `backend/src/config/createTables.sql` in Supabase SQL Editor (see `docs/MODULE_2.md`). Doc path `server/` = `backend/`.

**Module 3** auth: `docs/MODULE_3.md` — `/api/auth/*`, JWT cookie + Bearer, `AuthContext` on frontend.

## Structure

```
Doctor Hub/
├── frontend/     Patient app (Module 1: pages/auth, pages/patient, …)
├── admin/        Staff portal (Module 1: pages/admin, doctor, assistant, …)
├── backend/      Express API + src/routes (Module 1 doc paths)
├── shared/ui/    Shared Doctor Hub theme + components
├── docs/         MODULE_1.md checklist
├── CareLink/     Reference only (do not present as final project)
└── supabase/     SQL setup
```

## Setup

1. Supabase SQL Editor:
   - `backend/supabase_schema.sql`
   - `supabase/003_extensions.sql`

2. `npm install` then `npm run dev`

3. Admin http://localhost:5174 → Add Doctor (set **diseases**: `diabetes, fever, migraine`)

4. Patient http://localhost:5173 → Register → Book → Pay → Admin **Verify Payments** → Confirmed

## Documentation workflow

1. Patient searches doctor (disease + allopathic/homeopathic/herbal)
2. Books slot (CareLink-style slots)
3. Pays with Stripe
4. **Assistant** confirms in Admin → Verify Payments
5. Status **confirmed** → optional video consult page

## Credentials

From `backend/.env`:

- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Create patient via frontend Register

## Viva

- CareLink = reference for **appointment mechanics**
- Doctor Hub = full spec + better UI + assistant verification + history + AI

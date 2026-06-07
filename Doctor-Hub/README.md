# Doctor Hub

**Doctor Hub** is your project. **CareLink** in this repo is only a **reference** for how working appointment booking + Stripe + admin was built — we did **not** intend to ship a copy of CareLink.

## What you asked for vs what we fixed

| Your requirement | Implementation |
|------------------|----------------|
| Appointments working **like** CareLink | Same slot booking + Stripe flow (proven backend) |
| Documentation features | Disease filter, treatment types, assistant verification, medical history, AI check |
| UI **better** than CareLink | New Doctor Hub design (teal, DM Sans, cards, workflow section) |
| Frontend / backend separate | `frontend/` + `backend/` + `admin/` |

## Unified UI (CareLink-style — inside each app)

Theme and shared components live in **`src/lib/`** inside frontend and admin (no root `shared/` folder):

- `src/lib/ui/styles.css` — fonts, `.dh-btn`, `.dh-card`, `.dh-input`, `.dh-hero`, etc.
- `src/lib/ui/tailwind.preset.js` — teal colors, shadows
- `BrandLogo.jsx`, `PageHeader.jsx` — `import X from '@doctor-hub/ui/...'`

| App | Port |
|-----|------|
| `frontend/` (patient) | 5173 |
| `admin/` (staff) | 5174 |

**Module 1** is implemented on `frontend/` + `backend/` + `admin/` (see `docs/MODULE_1.md`). Do not use separate `client/` / `server/` copies.

**Module 2** database: run `backend/src/config/createTables.sql` in Supabase SQL Editor (see `docs/MODULE_2.md`). Doc path `server/` = `backend/`.

**Module 3** auth: `docs/MODULE_3.md` — `/api/auth/*`, JWT cookie + Bearer, `AuthContext` on frontend.

## Structure (CareLink-style — three deployable apps)

```
Doctor-Hub/
├── frontend/          Patient app (Vite, port 5173)
│   └── src/lib/       UI theme + hooks + constants
├── admin/             Staff portal (Vite, port 5174)
│   └── src/lib/       UI theme + hooks + constants
├── backend/           Express API (port 4000)
├── docs/              MODULE_1.md checklist
├── CareLink/          Reference only — working Vercel deploy pattern
└── supabase/          SQL setup
```

**Vercel:** three separate projects — see `DEPLOYMENT.md`. Each app deploys on its own, no shared folder outside the app.

## Setup

1. Supabase SQL Editor:
   - `backend/supabase_schema.sql`
   - `supabase/003_extensions.sql`

2. Local run (CareLink-style — each app, or all at once from root):

```bash
cd backend && npm install && npm run dev   # terminal 1
cd frontend && npm install && npm run dev  # terminal 2
cd admin && npm install && npm run dev     # terminal 3
```

Or from `Doctor-Hub/`: `npm install` then `npm run dev`

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

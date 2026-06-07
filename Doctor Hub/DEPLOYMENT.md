# Doctor Hub — Vercel Deployment Guide

Deploy **three separate Vercel projects** from this monorepo:

| Project  | Vercel Root Directory | Framework |
|----------|----------------------|-----------|
| Frontend | `Doctor Hub/frontend`  | Vite      |
| Admin    | `Doctor Hub/admin`     | Vite      |
| Backend  | `Doctor Hub/backend`   | Express   |

> If your Git repository root **is** the `Doctor Hub` folder (not `doctor-patient-hub-final`), use `frontend`, `admin`, and `backend` as Root Directory instead.

---

## Prerequisites

1. Git repository pushed to GitHub / GitLab / Bitbucket
2. [Vercel account](https://vercel.com)
3. **Supabase** project with schema applied (`backend/supabase_schema.sql`, `supabase/*.sql`)
4. **Cloudinary** account (recommended for profile images and lab reports on Vercel)
5. **Stripe** keys (if using card payments)
6. **SMTP** credentials (for password reset emails)

**Deploy backend first** — frontend and admin need the live API URL.

---

## Critical monorepo setting (frontend & admin only)

`frontend` and `admin` import code from `../shared/` (sibling folder). Vercel must include files outside the app root.

For **each** frontend and admin Vercel project:

1. **Settings → General → Root Directory** → set to `Doctor Hub/frontend` or `Doctor Hub/admin`
2. Enable **“Include source files outside of the Root Directory in the Build Step”**
3. Save

Without step 2, the build fails with errors like:

```
Failed to resolve import "../shared/ui/vite-alias.js"
Failed to resolve import "@doctor-hub/ui/..."
```

`vercel.json` in each app already runs `cd .. && npm install` so workspace dependencies and `shared/` resolve correctly.

---

## 1. Deploy backend

### Create project

1. [vercel.com/new](https://vercel.com/new) → Import your repository
2. **Root Directory:** `Doctor Hub/backend` (Edit → enter path → Continue)
3. **Framework Preset:** Other
4. **Build Command:** leave empty (none required)
5. **Output Directory:** leave default
6. Deploy

`backend/api/index.js` is the Vercel serverless entry (re-exports `server.js`). `backend/vercel.json` routes all traffic to `/api/index.js`.

**Vercel project settings (backend):** Framework Preset = **Express** (or Other with `vercel.json` above). Root Directory = `Doctor Hub/backend`. Do **not** override Output Directory to `public`.

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Required | Example |
|----------|----------|---------|
| `JWT_SECRET` | Yes | long random string |
| `SUPABASE_URL` | Yes | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | service role key (never expose to browser) |
| `FRONTEND_URL` | Yes | `https://your-frontend.vercel.app` |
| `ADMIN_URL` | Yes | `https://your-admin.vercel.app` |
| `API_PUBLIC_URL` | Yes | `https://your-backend.vercel.app` |
| `CLOUDINARY_NAME` | Strongly recommended | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Strongly recommended | |
| `CLOUDINARY_SECRET_KEY` | Strongly recommended | |
| `STRIPE_SECRET_KEY` | For Stripe | |
| `CURRENCY` | Optional | `USD` or `pkr` |
| `ADMIN_EMAIL` | For staff login | |
| `ADMIN_PASSWORD` | For staff login | |
| `SUPER_ADMIN_EMAIL` | Optional | |
| `SUPER_ADMIN_PASSWORD` | Optional | |
| `SMTP_HOST` | For email | `smtp.gmail.com` |
| `SMTP_PORT` | For email | `587` |
| `SMTP_USER` | For email | |
| `SMTP_PASS` | For email | |
| `CORS_ALLOWED_ORIGINS` | Optional | Comma-separated preview URLs |

Copy from `backend/.env.example` for the full list.

### Verify backend

```bash
curl https://your-backend.vercel.app/api/health
# {"ok":true,"service":"doctor-hub-api"}
```

---

## 2. Deploy frontend

### Create project

1. New Vercel project → same repository
2. **Root Directory:** `Doctor Hub/frontend`
3. **Enable:** “Include source files outside of the Root Directory in the Build Step”
4. Framework should auto-detect **Vite** (from `frontend/vercel.json`)
5. Deploy

### Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_BACKEND_URL` | Yes | `https://your-backend.vercel.app` |
| `VITE_API_URL` | Optional | `https://your-backend.vercel.app/api` |
| `VITE_ADMIN_URL` | Yes | `https://your-admin.vercel.app` |
| `VITE_CURRENCY` | Optional | `Rs` |

> Vite embeds `VITE_*` at **build time**. Redeploy after changing them.

### Verify frontend

- Open `https://your-frontend.vercel.app`
- Register a patient account
- Confirm API calls hit your backend (browser DevTools → Network)

---

## 3. Deploy admin

### Create project

1. New Vercel project → same repository
2. **Root Directory:** `Doctor Hub/admin`
3. **Enable:** “Include source files outside of the Root Directory in the Build Step”
4. Framework: **Vite**
5. Deploy

### Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_BACKEND_URL` | Yes | `https://your-backend.vercel.app` |
| `VITE_API_URL` | Optional | `https://your-backend.vercel.app/api` |
| `VITE_FRONTEND_URL` | Yes | `https://your-frontend.vercel.app` |
| `VITE_CURRENCY` | Optional | `Rs` |

### Verify admin

- Open `https://your-admin.vercel.app`
- Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Confirm dashboard loads data from API

---

## CORS configuration

Backend allow-list (`backend/server.js`):

- `http://localhost:5173` / `5174` (local dev)
- `FRONTEND_URL` (production patient app)
- `ADMIN_URL` (production staff app)
- `CORS_ALLOWED_ORIGINS` (optional comma-separated extras, e.g. Vercel preview URLs)

**Rules:**

- No trailing slash on URLs (`https://app.vercel.app` not `https://app.vercel.app/`)
- `FRONTEND_URL` and `ADMIN_URL` on backend must match the **exact** origins browsers use
- After changing CORS env vars, **redeploy backend**

**Preview deployments:** Add preview URLs to `CORS_ALLOWED_ORIGINS` on backend, or test with production URLs only.

---

## Common errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to resolve import "../shared/..."` | Monorepo sibling not included | Enable “Include source files outside Root Directory” on frontend/admin |
| `Origin not allowed` / CORS 403 | Backend CORS mismatch | Set `FRONTEND_URL` / `ADMIN_URL` on backend to exact deployed URLs |
| `Missing Supabase env` | Backend env not set | Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, redeploy |
| `JWT_SECRET missing` | Backend env not set | Add `JWT_SECRET`, redeploy |
| API calls go to `localhost` | `VITE_BACKEND_URL` not set at build | Set env on frontend/admin, **redeploy** |
| `undefined/api/...` in admin | Missing `VITE_BACKEND_URL` | Set env var, redeploy admin |
| Payment proof image broken | Cloudinary/Supabase not configured | Add Cloudinary creds on backend; ensure `API_PUBLIC_URL` is set |
| Upload returns 413 | File > ~4.5 MB | Vercel body limit; use smaller images (app compresses screenshots) |
| Staff redirect after login fails | `VITE_ADMIN_URL` wrong on frontend | Set to live admin URL, redeploy frontend |
| Stripe redirect to localhost | `FRONTEND_URL` not set on backend | Set production frontend URL on backend |

---

## Local build verification (before deploy)

From `Doctor Hub/`:

```bash
npm install
npm run build -w frontend
npm run build -w admin
```

Simulate Vercel frontend build:

```bash
cd frontend
cd .. && npm install && cd frontend && npm run build
```

---

## Final live checklist

### Backend
- [ ] `GET /api/health` returns `{ "ok": true }`
- [ ] `JWT_SECRET`, Supabase, `FRONTEND_URL`, `ADMIN_URL`, `API_PUBLIC_URL` set
- [ ] Cloudinary configured (uploads on Vercel)

### Frontend
- [ ] Home page loads
- [ ] Register + login works
- [ ] Patient dashboard loads appointments
- [ ] Staff roles redirect to admin with `authToken`

### Admin
- [ ] Admin login works
- [ ] Doctors list / appointments load
- [ ] Link to patient site (`VITE_FRONTEND_URL`) works

### Cross-app
- [ ] Patient login as doctor → redirects to admin dashboard
- [ ] Manual payment upload → proof visible in admin Verify Payments
- [ ] Lab report upload → download works
- [ ] No CORS errors in browser console

### Optional
- [ ] Stripe checkout redirects back to frontend
- [ ] Password reset email sends
- [ ] Chat notifications poll without errors

---

## Architecture reminder

```
frontend (Vercel)  ──HTTPS──►  backend (Vercel)  ──►  Supabase
admin (Vercel)     ──HTTPS──►  backend (Vercel)  ──►  Cloudinary
```

Import paths and `shared/` folder are unchanged. Monorepo layout is preserved.

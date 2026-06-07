# Doctor Hub — Vercel Deployment (CareLink pattern)

Deploy **three separate Vercel projects** — same layout as **CareLink**.

```
Doctor-Hub/
├── frontend/     # Patient app  → Vercel project 1
├── admin/        # Staff app    → Vercel project 2
└── backend/      # Express API  → Vercel project 3
```

Each folder is **self-contained** (own `package.json`, own `vercel.json`, own UI in `src/lib/`).  
No monorepo tricks. No shared folder outside the app.

> **Repo root is `doctor-patient-hub-final`?** Root Directory: `Doctor-Hub/frontend`, `Doctor-Hub/admin`, `Doctor-Hub/backend`.  
> **Repo root is `Doctor-Hub`?** Use `frontend`, `admin`, `backend`.

---

## 1. Backend (deploy first)

| Setting | Value |
|---------|-------|
| Root Directory | `Doctor-Hub/backend` |
| Framework Preset | **Other** |
| Build Command | empty |
| Output Directory | empty |

`backend/vercel.json` routes all traffic to `server.js`.

### Environment variables

| Variable | Required |
|----------|----------|
| `JWT_SECRET` | Yes |
| `SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `FRONTEND_URL` | Yes |
| `ADMIN_URL` | Yes |
| `API_PUBLIC_URL` | Yes |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yes |
| `CLOUDINARY_*` | Recommended |

See `backend/.env.example` for full list.

### Verify

Dashboard → Deployments → latest → **Visit** → copy URL.

```text
GET https://YOUR-BACKEND-URL/
GET https://YOUR-BACKEND-URL/api/health
```

---

## 2. Frontend

| Setting | Value |
|---------|-------|
| Root Directory | `Doctor-Hub/frontend` |
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |

No **Include outside root** needed — all code is inside `frontend/`.

### Environment variables

| Variable | Required |
|----------|----------|
| `VITE_BACKEND_URL` | Yes |
| `VITE_ADMIN_URL` | Yes |

---

## 3. Admin

| Setting | Value |
|---------|-------|
| Root Directory | `Doctor-Hub/admin` |
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Environment variables

| Variable | Required |
|----------|----------|
| `VITE_BACKEND_URL` | Yes |
| `VITE_FRONTEND_URL` | Yes |

---

## Local development (CareLink-style)

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
cd admin && npm install && npm run dev
```

Or from `Doctor-Hub/`: `npm install && npm run dev`

---

## UI code location

Shared theme/components live **inside each app** (CareLink pattern):

```
frontend/src/lib/ui/       # BrandLogo, DoctorPhoto, styles.css, …
frontend/src/lib/constants/
frontend/src/lib/hooks/

admin/src/lib/ui/          # Same files copied into admin
admin/src/lib/constants/
admin/src/lib/hooks/
```

Imports use aliases: `@doctor-hub/ui/...`, `@doctor-hub/constants/...`, `@doctor-hub/hooks/...`

---

## Common errors

| Error | Fix |
|-------|-----|
| `DEPLOYMENT_NOT_FOUND` | Use **Visit** URL from latest deployment |
| `Origin not allowed` | Set `FRONTEND_URL` / `ADMIN_URL` on backend |
| API calls to `localhost` | Set `VITE_BACKEND_URL`, redeploy |
| Backend 404 | Root Directory = `Doctor-Hub/backend` |

---

## Deploy order

1. Backend → env vars  
2. Frontend → `VITE_BACKEND_URL`, `VITE_ADMIN_URL`  
3. Admin → `VITE_BACKEND_URL`, `VITE_FRONTEND_URL`  
4. Update backend CORS URLs → redeploy backend

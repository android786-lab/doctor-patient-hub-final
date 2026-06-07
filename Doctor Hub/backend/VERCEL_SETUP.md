# Backend Vercel — Fix 404 NOT_FOUND

## Step 0: Confirm you are on the BACKEND project URL

The backend has its **own** Vercel project and URL.  
In Vercel dashboard → **backend project** → **Deployments** → open latest → copy **Visit** URL.

Do not use the frontend project URL.

## Step 1: Root Directory (most common 404 cause)

**Settings → General → Root Directory** must be exactly:

```
Doctor Hub/backend
```

Not `Doctor Hub`, not `backend`, not empty.

## Step 2: Build settings

| Setting | Value |
|---------|-------|
| Build Command | Override **OFF** (empty) |
| Output Directory | Override **OFF** (empty) |
| Install Command | `npm install` (default) |

**Never** add `vercel-build` to `package.json` — Vercel auto-runs it and skips API functions.

## Step 3: After deploy — test in this order

1. `https://YOUR-BACKEND-URL/deploy-check.json`  
   - JSON with `"static": true` → Root Directory is **correct**  
   - 404 → Root Directory is **wrong** or wrong project URL

2. `https://YOUR-BACKEND-URL/api/health`  
   - `{"ok":true,"via":"api/health.js"}` → serverless functions work  
   - 404 → `vercel.json` / builds issue

3. `https://YOUR-BACKEND-URL/`  
   - `{"status":"ok","message":"Doctor Hub API"}` → full Express works

## Step 4: Environment variables (Production)

```
JWT_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
API_PUBLIC_URL=https://YOUR-BACKEND-URL
ADMIN_EMAIL
ADMIN_PASSWORD
```

## Good build log signs

- `added XXX packages` (backend deps only, ~174) ✓
- `Build Completed in /vercel/output` ✓
- **No** `Running "npm run vercel-build"` ✓
- **No** `WARNING! Due to builds existing` (legacy `builds` removed — uses `api/` + `rewrites`)

## How routing works (current `vercel.json`)

| Path | Handler |
|------|---------|
| `/deploy-check.json` | `public/deploy-check.json` (static, auto-served) |
| `/api/health` | `api/health.js` (standalone function) |
| Everything else | `api/index.js` → Express (`server.js`) via rewrite |

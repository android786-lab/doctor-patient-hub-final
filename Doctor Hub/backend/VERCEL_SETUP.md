# Backend Vercel Setup — Fix 404 NOT_FOUND

## What NOT_FOUND means

Vercel's `404: NOT_FOUND` (white page with Code + ID) means **no serverless function and no static file** matched the URL. This is **not** an Express error — the request never reached your API code.

## Required Vercel project settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `Doctor Hub/backend` |
| **Framework Preset** | Other or Express |
| **Build Command** | Override **OFF** (empty) |
| **Output Directory** | Override **OFF** (empty — never `public`) |
| **Install Command** | `npm install` (default) |

If Root Directory is `Doctor Hub` or `backend` (without `Doctor Hub/`), you will **always** get 404.

## After deploy — test in this order

1. `https://YOUR-URL.vercel.app/api/health`  
   - If this works → functions deploy; Express route is next  
   - If this fails → Root Directory is wrong

2. `https://YOUR-URL.vercel.app/api/health` (Express route in server.js)  
   - `https://YOUR-URL.vercel.app/` → `{ "status": "ok", ... }`

## Environment variables (Production)

```
JWT_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
API_PUBLIC_URL=https://YOUR-URL.vercel.app
ADMIN_EMAIL
ADMIN_PASSWORD
```

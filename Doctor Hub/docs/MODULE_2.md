# Module 2 — Supabase database

## Files

| File | Purpose |
|------|---------|
| `backend/src/config/supabase.js` | Service-role Supabase client (doc: `server/src/config/supabase.js`) |
| `backend/src/config/createTables.sql` | Full schema — **run manually in Supabase** |

## Run SQL (you must do this)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project  
2. **SQL Editor** → **New query**  
3. Open `backend/src/config/createTables.sql` in this repo  
4. **Copy the entire file** and paste into the editor  
5. Click **Run**  
6. **Table Editor** → confirm: `users`, `patients`, `doctors`, `assistants`, `clinics`, `appointments`, `payments`, `medical_history`, `prescriptions`

## `.env` (backend)

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service role — backend only
JWT_SECRET=...
```

## Old schema warning

If you already ran `backend/supabase_schema.sql` (CareLink-style), tables conflict with Module 2. Options:

- **Fresh Supabase project** (recommended for FYP doc schema), or  
- Drop old tables before running `createTables.sql`

## Immutable data rules

| Table | Rule |
|-------|------|
| `medical_history` | **No DELETE** (append-only) — DB trigger + backend controllers |
| `prescriptions` | **No UPDATE / DELETE** — DB trigger + backend controllers |

Defined in `backend/src/config/supabase.js` as `IMMUTABLE_RULES`.

# Module 3 — Authentication

Doc path `server/` = `backend/`.

## API (`/api/auth`)

| Method | Path | Body |
|--------|------|------|
| POST | `/register` | `full_name`, `email`, `password`, `role` (`patient` \| `doctor`), `phone` |
| POST | `/login` | `email`, `password` → `{ user, token }` + httpOnly `token` cookie |
| POST | `/logout` | clears cookie |
| POST | `/forgot-password` | `email` → mock reset message or 404 |

## Env

```env
JWT_SECRET=long-random-string
JWT_EXPIRES_IN=7d
SUPABASE_SERVICE_ROLE_KEY=...
```

## Database

Auth expects **`users`** with `email`, `password`, `role`, `is_active`, plus **`patients`** / **`doctors`** rows linked by `user_id`.

If you use **`profiles`** + Supabase Auth (`001_initial_schema.sql`) only, run `supabase/005_module3_auth_users.sql` or align tables before testing register.

## Frontend

- `AuthContext`: `login`, `register`, `logout`, JWT from `localStorage`
- Staff roles redirect to **admin app** (`VITE_ADMIN_URL`, default `http://localhost:5174`) without tokens in the URL; the staff portal restores the session from the httpOnly login cookie via `GET /api/auth/staff-session` and stores JWT in `localStorage` (`aToken` / `dToken`).

## Test

1. `npm run dev` from repo root  
2. Register at `http://localhost:5173/auth/register`  
3. Login → patient → `/patient/dashboard`  
4. Doctor login → admin portal doctor dashboard  

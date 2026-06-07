# Doctor Hub — Database setup

Pehle wala complex migration **hata kar** CareLink wala schema use karo (yeh actually kaam karta hai).

## Steps

1. Supabase → **SQL Editor**
2. Run **`backend/supabase_schema.sql`** (creates `users`, `doctors`, `appointments`)
3. Run **`supabase/008_fix_table_grants.sql`** (required — fixes “permission denied for table users” on register)
4. Run **`supabase/009_patients_link_users.sql`** if register fails on `patients_user_id_fkey`
3. Run **`supabase/003_extensions.sql`** (medical history + AI tables)
4. Agar error aaye **"column appointments.date does not exist"** → run **`supabase/004_appointments_date.sql`**
5. Backend `.env` mein `SUPABASE_KEY` = service role key (same as `SUPABASE_SERVICE_ROLE_KEY`)

**Note:** `supabase/migrations/001_initial_schema.sql` mat chalao — woh alag schema hai. Sirf `backend/supabase_schema.sql` use karo.

## Verify

Table Editor mein: `users`, `doctors`, `appointments`, `medical_history`, `ai_predictions`

## Admin / Doctor

- **Admin panel:** http://localhost:5174 (see root README)
- Admin login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`
- Doctors add karo admin se (image Cloudinary par upload)

## Patient test

Register on http://localhost:5173 → book appointment → Stripe pay

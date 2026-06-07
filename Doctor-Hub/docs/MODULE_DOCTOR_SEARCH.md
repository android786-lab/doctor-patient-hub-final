# Doctor search & filter

## API (public)

| Method | Path | Query |
|--------|------|--------|
| GET | `/api/doctors` | `search`, `treatment_type`, `city` |
| GET | `/api/doctors/:id` | — |

Returns verified, active doctors only (`is_verified = true`, `is_active ≠ false`). Password is never included.

Legacy CareLink list: `GET /api/doctors/legacy/list`

## Frontend

| Route | Page |
|-------|------|
| `/patient/find-doctors` | Search + filters + cards |
| `/patient/doctor/:id` | Full profile + clinics |

## Supabase

If search returns no rows:

1. Run `supabase/006_doctors_search_columns.sql` (safe for 001 `profiles` schema — no `name` column needed).
2. Set verified doctors, e.g. `UPDATE doctors SET is_verified = true, is_active = true;`

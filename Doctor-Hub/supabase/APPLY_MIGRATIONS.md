# Supabase migrations (Doctor Hub)



Agar admin register karte waqt **"Admin registration table missing"** aaye, ye step karein:



## 023 — Assistants link to public.users

Run if **Add assistant** fails with `assistants_user_id_fkey`:

1. SQL Editor → `supabase/023_assistants_link_users.sql`

---

## 022 — Doctor module (schedules, clinic fields)

Required for date-based `doctor_schedules` and clinic `availableDays`:

1. SQL Editor → `supabase/022_doctor_module.sql`

---

## 021 — Module 1 schema (users.name, doctor fee, patient notes)

Run if aligning with semester Module 1 prompt fields:

1. SQL Editor → `supabase/021_module1_schema_align.sql`

---

## 029 — OTP password reset

Required for 6-digit email OTP reset (replaces email-link flow):

1. SQL Editor → `supabase/029_password_reset_otp.sql`

---

## 020 — Password reset, patient report attachments, prescription PDF

Required for forgot-password, lab report uploads, and e-prescription PDF:

1. SQL Editor → `supabase/020_password_reset_and_reports.sql` run karo

---

## 019 — Chat read receipts (message notifications / badges)

Unread badges aur toast ke liye (optional lekin recommended):

1. SQL Editor → `supabase/019_appointment_chat_reads.sql` run karo

---

## 016 — Appointment messages (required for patient/doctor chat)

Agar **Messages** par click karte waqt `appointment_messages` / schema cache error aaye:

1. [SQL Editor](https://supabase.com/dashboard/project/tiwjutktvzwkxxwlwwgb/sql/new)
2. `supabase/016_appointment_messages.sql` ka poora SQL run karo
3. 10–20 sec wait, phir chat page refresh

---

## 017 — Admin registration (required for `/register-admin`)



1. [Supabase Dashboard](https://supabase.com/dashboard) → apna project → **SQL Editor** → **New query**

2. File `supabase/017_admin_registration_requests.sql` kholo, **poora SQL copy** karo, editor mein paste karo

3. **Run** dabao — success message aana chahiye

4. (Optional) **Settings → API** → **Reload schema** ya 1–2 minute wait (PostgREST cache)

5. Admin register form dubara try karo



Direct link (apna project):  

`https://supabase.com/dashboard/project/tiwjutktvzwkxxwlwwgb/sql/new`



## Baqi migrations (order)



Pehle se na chali hon to number order mein SQL Editor mein run karein:



| File | Purpose |

|------|---------|

| `003_extensions.sql` | Extensions |

| `005_module3_auth_users.sql` | Users / auth |

| `007_medical_history_module.sql` | Medical history |

| `009_patients_link_users.sql` | Patients |

| `010_clinics_table.sql` | Clinics |

| `011_doctors_link_users.sql` | Doctors |

| `012_doctors_weekly_schedule.sql` | Schedule |

| `013_payment_manual.sql` | Manual payments |

| `014_payment_proofs_storage.sql` | Proof storage |

| `015_appointment_status_payment_uploaded.sql` | Payment status |

| `016_appointment_messages.sql` | Chat messages |

| **`017_admin_registration_requests.sql`** | **Admin register** |

| `018_super_admin_bootstrap.sql` | Optional: promote super admin (commented SQL) |
| **`020_password_reset_and_reports.sql`** | **Password reset + report attachments** |
| `024_medical_history_columns.sql` | Extra history columns |
| `025_doctors_available_compat.sql` | Doctor availability compat |
| `026_appointment_early_end.sql` | Early appointment end metadata |
| **`027_immutability_triggers.sql`** | **DB triggers: no delete history / no edit Rx** |
| `028_user_notifications.sql` | In-app notifications (payment rejected) |



`008_fix_table_grants.sql` aur `migrations/002_api_grants.sql` grants ke liye useful hain agar tables "schema cache" error dein.

---

## 027 — Immutability triggers (required for submission / rubric)

Medical records API par 403 deta hai; yeh migration **database level** par bhi block karti hai.

1. SQL Editor → `supabase/migrations/027_immutability_triggers.sql` (or `supabase/027_immutability_triggers.sql` — same content)
2. Pehle `007_medical_history_module.sql` chal chuka hona chahiye
3. Test (optional): kisi row par `DELETE FROM medical_history ...` try karo — error aana chahiye


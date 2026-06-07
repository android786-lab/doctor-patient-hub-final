-- Link assistants.user_id → public.users (CareLink / Module 3 auth)
-- Run in Supabase SQL Editor when "assistants_user_id_fkey" fails on create assistant.
--
-- Old 001 schema points assistants.user_id at profiles(id). Module 3 auth uses public.users.

ALTER TABLE assistants DROP CONSTRAINT IF EXISTS assistants_user_id_fkey;

DELETE FROM assistants a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.user_id);

ALTER TABLE assistants
  ADD CONSTRAINT assistants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

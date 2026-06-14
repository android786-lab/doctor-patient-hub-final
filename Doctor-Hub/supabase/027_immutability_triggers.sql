-- =============================================================================
-- 027 — Immutability triggers (medical_history & prescriptions)
-- =============================================================================
-- Enforces append-only medical history and immutable prescriptions at the
-- database level (defense in depth — the API also returns 403 on mutations).
--
-- Rules:
--   • medical_history: DELETE blocked
--   • prescriptions:   UPDATE and DELETE blocked
--
-- Run AFTER medical_history and prescriptions tables exist (e.g. 007 or 001).
-- Safe to re-run: uses CREATE OR REPLACE and DROP TRIGGER IF EXISTS.
-- =============================================================================

-- Block DELETE on medical_history
CREATE OR REPLACE FUNCTION doctor_hub_forbid_medical_history_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Medical history cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_history_no_delete ON medical_history;
CREATE TRIGGER trg_medical_history_no_delete
  BEFORE DELETE ON medical_history
  FOR EACH ROW
  EXECUTE FUNCTION doctor_hub_forbid_medical_history_delete();

-- Block UPDATE on prescriptions
CREATE OR REPLACE FUNCTION doctor_hub_forbid_prescriptions_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Prescriptions cannot be edited';
END;
$$;

DROP TRIGGER IF EXISTS trg_prescriptions_no_update ON prescriptions;
CREATE TRIGGER trg_prescriptions_no_update
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION doctor_hub_forbid_prescriptions_update();

-- Block DELETE on prescriptions
CREATE OR REPLACE FUNCTION doctor_hub_forbid_prescriptions_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Prescriptions cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_prescriptions_no_delete ON prescriptions;
CREATE TRIGGER trg_prescriptions_no_delete
  BEFORE DELETE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION doctor_hub_forbid_prescriptions_delete();

NOTIFY pgrst, 'reload schema';

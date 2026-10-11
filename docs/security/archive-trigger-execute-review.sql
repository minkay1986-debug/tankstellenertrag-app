-- REVIEW DRAFT ONLY — NOT APPLIED TO SUPABASE.
-- Purpose: remove direct PostgREST/RPC execution of a trigger-only function.
-- Keep the existing trigger on public.station_snapshots intact.
-- Before applying: verify the function has no legitimate direct RPC callers.
-- After applying: verify UPDATE on an owned station_snapshot still archives OLD payload.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.archive_station_snapshot_before_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_station_snapshot_before_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_station_snapshot_before_update() FROM authenticated;

COMMIT;

-- Post-apply checks (run separately):
-- 1) Confirm the trigger station_snapshot_history_before_update remains enabled.
-- 2) Confirm anon/authenticated no longer have EXECUTE on the function.
-- 3) In a controlled test account, update a station_snapshots payload and verify
--    station_snapshot_history receives the previous payload exactly once.
-- 4) Confirm the normal dashboard save/autosave still works.

-- Security hardening proposal for review; do not apply without regression checks.
-- Preserve authenticated customer/admin workflows and intentionally public idea/visit endpoints.
-- anon has no matching RLS policies on these sensitive tables, so direct anon grants are unnecessary.
REVOKE ALL PRIVILEGES ON TABLE public.stations FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.station_snapshots FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.pilot_applications FROM anon;

-- Trigger functions are invoked by database triggers, not as client RPC endpoints.
-- Remove direct RPC execution grants while retaining their trigger behavior.
REVOKE EXECUTE ON FUNCTION public.archive_station_snapshot_before_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_ten_free_pilot_slots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.skip_duplicate_site_visit() FROM PUBLIC, anon, authenticated;

-- Intentionally public endpoints are deliberately left alone:
-- public.get_pilot_slots()
-- public.track_public_visit(text)
-- public_idea_suggestions INSERT policy for anon/authenticated

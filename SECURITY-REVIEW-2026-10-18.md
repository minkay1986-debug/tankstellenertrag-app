# Supabase database security review — 2026-10-18

## Status
Read-only inspection of the live Supabase project. No production schema, permissions, or data have been changed.

## Findings verified
- RLS is enabled on `stations`, `station_snapshots`, `pilot_applications`, and the five tables reported by Security Advisor.
- The live policies inspected for `stations` permit authenticated users to select their own stations and admins to select customer stations.
- `station_snapshots` has owner-scoped select/insert/update policies and a separate admin select policy.
- `pilot_applications` has an authenticated own-application select policy and an admin update policy. No anon policies were found in the inspected policy list.
- Despite this, `anon` has table privileges on `stations`, `station_snapshots`, and `pilot_applications`. RLS currently acts as an additional barrier; the grants are broader than necessary.
- Three trigger functions have direct EXECUTE privileges for `anon` and `authenticated`: `archive_station_snapshot_before_update()`, `enforce_ten_free_pilot_slots()`, `skip_duplicate_site_visit()`. They are trigger handlers, not intended RPC endpoints.
- `get_pilot_slots()` and `track_public_visit(text)` appear to serve public website functions and are intentionally not included in the proposed revoke.
- `public_idea_suggestions` has a deliberate anon/authenticated INSERT policy with suggestion length validation; do not revoke its public insert path as part of this change.
- The five RLS-enabled/no-policy tables have no direct anon/authenticated table privileges in the checked grant snapshot.

## Proposed migration
See `supabase/migrations/20261018183000_least_privilege_security_hardening.sql`.
It only revokes unnecessary direct grants from `anon` on three sensitive tables and direct EXECUTE grants on three trigger functions. It does not drop functions, tables, policies, or data and does not change authenticated customer/admin grants.

## Required regression checks before production apply
1. Anonymous visitor: public landing page visit counting and pilot-slot display.
2. Anonymous/authenticated ideas box: submit a valid suggestion; invalid lengths remain rejected.
3. Authenticated customer: read/write own station and snapshots; cannot read another customer's rows.
4. Admin: list/update pilot applications, read stations/snapshots, process cancellations, and use admin snapshot restore.
5. Trigger paths: snapshot history archive on update; ten-free-pilot-slot enforcement; duplicate site visit suppression.
6. Check function privileges and Security Advisor after migration.

## Limitation
The live SQL checks establish policies and grants, not a full adversarial API test under separate real customer identities. No confirmed cross-customer access was demonstrated, but this is not a formal penetration test. The proposed migration is intentionally not applied to production.

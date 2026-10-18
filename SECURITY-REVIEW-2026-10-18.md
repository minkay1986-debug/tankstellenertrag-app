# Supabase database security review — 2026-10-18

## Status
Read-only inspection of the live Supabase project. No production schema, permissions, or data have been changed.

## Findings verified
- RLS is enabled on `stations`, `station_snapshots`, `pilot_applications`, and the five tables reported by Security Advisor.
- The live policies inspected for `stations` permit authenticated users to select their own stations and admins to select customer stations.
- `station_snapshots` has owner-scoped select/insert/update policies and a separate admin select policy.
- `pilot_applications` has an authenticated own-application select policy and an admin update policy. No anon policies were found in the inspected policy list.
- Despite this, `anon` has table privileges on `stations`, `station_snapshots`, and `pilot_applications`. RLS currently acts as an additional barrier; the grants are broader than necessary.
- Three trigger functions have direct EXECUTE privileges for `anon` and `authenticated`: `archive_station_snapshot_before_update()`, `enforce_ten_free_pilot_slots()`, `skip_duplicate_site_visit()`. They are trigger handlers, not intended RPC endpoints. Live trigger metadata confirms all three are attached to enabled triggers.
- `get_pilot_slots()` returns only the public remaining-slot count. `track_public_visit(text)` validates visitor ID length and inserts only into the public visit counter table. They remain intentionally public.
- `public_idea_suggestions` has a deliberate anon/authenticated INSERT policy with suggestion length validation; do not revoke its public insert path as part of this change.
- The five RLS-enabled/no-policy tables have no direct anon/authenticated table privileges in the checked grant snapshot.
- The current Supabase Security Advisor still reports the three trigger functions and two intended public functions as callable SECURITY DEFINER functions. The proposed migration addresses only the three trigger handlers; the two public endpoints require a separate decision because the website uses them.

## Tests performed
- Read-only inspection of RLS policies and role/table grants: completed.
- Read-only inspection of trigger attachments: completed; all three target functions are attached to enabled triggers.
- Function-definition review: completed. The trigger handlers are trigger-returning functions; their body paths use schema-qualified table references (the pilot-slot enforcement function explicitly references `auth.users` and `public.stations`).
- Proposed change review: the SQL only removes direct grants from `anon` on three tables and direct execute grants on the three trigger functions. It does not delete functions, tables, policies, or data and does not change authenticated customer/admin table grants.
- GitHub Actions/commit checks for this security branch: no workflow runs or status checks were returned. Therefore there is no automated CI pass for this PR yet.
- A live application test as separate anon/customer/admin identities has not been completed. The migration was not applied to production, and the trigger behavior has not been exercised by a committed update. Those are explicit remaining tests, not assumed passes.

## Proposed migration
See `supabase/migrations/20261018183000_least_privilege_security_hardening.sql`.

## Required tests before production apply
1. Anonymous visitor: public landing page visit counting and pilot-slot display.
2. Anonymous/authenticated ideas box: submit a valid suggestion; invalid lengths remain rejected.
3. Authenticated customer: read/write own station and snapshots; cannot read another customer's rows.
4. Admin: list/update pilot applications, read stations/snapshots, process cancellations, and use admin snapshot restore.
5. Trigger paths: snapshot history archive on update; ten-free-pilot-slot enforcement; duplicate site visit suppression.
6. Re-check function privileges and Security Advisor after applying in a disposable Supabase development branch or staging project.

## Limitation
The live SQL checks establish policies and grants, not a full adversarial API test under separate real customer identities. No confirmed cross-customer access was demonstrated, but this is not a formal penetration test. The proposed migration is intentionally not applied to production.

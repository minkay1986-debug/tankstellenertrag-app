# E2E audit: superadmin-only account lifecycle and company/role management

Scope: test branch `test/company-role-management-2026-11-20` only. Do not deploy/merge to live until the tests pass and owner approves.

## Required security invariant
Only the platform Superadmin (currently identified server-side by the configured admin identity) may:
- approve or deny account registration
- suspend/reactivate accounts
- soft-delete accounts and restore them
- permanently delete Auth accounts
- create/manage companies, memberships, roles and station assignments
- read the global customer/account list

Company admins may manage only permitted non-admin memberships/station access within their own company. They must never approve, delete, restore, suspend, create, or promote platform/company administrators or perform global administration.

## Audit findings before E2E
- Existing admin customer-account RPCs in the production schema use server-side email checks; reviewed read-only.
- The existing account delete RPC physically deletes `auth.users`, which is not a reversible restore operation.
- The admin-account overview only includes users associated with pilot applications or stations; it does not list every Auth account.
- The test Supabase project currently has only one Auth user and zero stations/pilot applications, so realistic multi-role browser E2E requires disposable test accounts/fixtures.
- Test-project company-role migration has been applied. The new company/role UI is committed on this branch.
- Account lifecycle approval/restoration/permanent deletion controls have not yet been implemented or E2E-verified.

## E2E acceptance matrix
1. Anonymous visitor: all admin RPCs denied; admin data not returned.
2. Authenticated non-admin: admin RPCs denied; no role escalation; cannot call account lifecycle actions.
3. Superadmin: can see all Auth accounts, including accounts without station/application rows; pending accounts are clearly pending.
4. Superadmin approve: account becomes approved and access follows server-side approval state.
5. Superadmin suspend: login/access blocked server-side; reason and audit trail retained.
6. Superadmin restore: reversible soft-delete/suspension state is cleared; account restored without recreating a new identity.
7. Superadmin permanent delete: only explicit destructive confirmation; Auth deletion server-side via service-role Edge Function; audit record retained without secrets.
8. Company admin: only own-company members and stations visible; cannot assign company_admin, modify another company, or access global accounts.
9. Regional manager/station manager: data access limited to explicit assignments and read/write permissions.
10. Cross-company and ID-tampering tests: change company/user/station IDs in direct RPC requests; all unauthorized requests rejected.
11. RLS: direct table reads/writes do not bypass lifecycle/role authorization.
12. Regression: existing customer analysis, login, station ownership, billing/subscription and deletion-retention flows remain unaffected.

## Required implementation before release
- A server-only account lifecycle API/Edge Function authenticated with the caller JWT and a verified platform-admin identity; service-role key never in frontend.
- Reversible soft-delete/suspend/restore state; permanent Auth deletion separate and explicitly confirmed.
- Server-side account approval state enforced by RLS/authorization helpers, not merely UI visibility.
- Full Auth user inventory in Superadmin view.
- Append-only audit trail of action, actor, target, timestamp, and outcome.
- Automated RPC/Edge tests plus browser E2E using disposable accounts for each role.
- No live deployment until the acceptance matrix passes.

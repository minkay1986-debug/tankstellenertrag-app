# TankstellenErtrag AI Advisor – isolated pilot

This Worker is a test-only server endpoint. It is not deployed and is not wired into the live app.

## Security and behavior
- Validates the Supabase access token against the Supabase Auth user endpoint.
- Uses only the verified Supabase user UUID for quota accounting; client-supplied identity is ignored.
- Enforces 3 successful AI responses per verified user per Europe/Berlin calendar day.
- Enforces a global daily request cap (default 250) in the same atomic transaction as the user cap.
- Uses one SQLite-backed Durable Object namespace for both counters and reservation state.
- Reserves both limits atomically before inference. If inference throws or returns an empty answer, the reservation is refunded exactly once.
- If refund bookkeeping fails, the reservation remains counted (fail closed); it is never silently restored.
- On a successful response, the reservation is finalized and remains counted.
- Stores only daily counters and opaque pending reservation IDs; it does not persist prompts, answers, or station facts.
- Uses Workers AI model `@cf/zai-org/glm-4.7-flash`.
- Accepts a question (max 1,600 chars) and optional precomputed facts (max 5,000 chars).
- The system prompt treats application KPI as authoritative and disallows recalculation, invented facts, HTML, and out-of-scope advice.
- CORS allows only exact origins listed in `ALLOWED_ORIGINS`; disallowed origins receive 403.

## Required bindings/secrets
- AI binding
- Durable Object binding `QUOTAS` to class `QuotaManager`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable/anon key only)
- `ALLOWED_ORIGINS` (comma-separated exact HTTPS origins)
- Optional `GLOBAL_DAILY_LIMIT` (default 250)

## Important limits before deployment
- The global request cap is not a monetary billing cap. Configure separate Cloudflare account-level budget alerts/spend controls and review Workers AI model availability/pricing before any deployment.
- Add observability and test the configured Supabase project and test-user authentication in an isolated environment.
- This Worker has not been deployed and is not connected to the live application.

## Local tests
Run `npm test` from this directory. The quota test suite covers concurrent per-user limits, global limits, reservation refunds, exactly-once finalization, and cross-user refund protection.

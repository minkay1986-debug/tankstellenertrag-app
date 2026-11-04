# TankstellenErtrag AI Advisor Worker

This directory contains the isolated **test Worker** configuration and source. It is not the production deployment configuration.

The application selects the test endpoint only for the local test server and the dedicated Pages preview. The exact production host `app.tankstellenertrag.de` selects the separately deployed Cloudflare Worker `tankstellenertrag-advisor-ai-live`. That live Worker is managed in Cloudflare; its production bindings and secrets are not stored in this repository.

## Security and behavior
- Validates the Supabase access token against the configured Supabase Auth user endpoint.
- Uses only the verified Supabase user UUID for quota accounting; client-supplied identity is ignored.
- Enforces 3 successful AI responses per verified user per Europe/Berlin calendar day.
- Enforces a global daily request cap through the Durable Object quota manager. The test configuration below sets 250; production has its own Cloudflare environment setting and is configured separately.
- Uses one SQLite-backed Durable Object namespace for both counters and reservation state.
- Reserves both limits atomically before inference. Failed or empty inference attempts are refunded exactly once where possible; if refund bookkeeping fails, the reservation remains counted (fail closed).
- Stores only daily counters and opaque pending reservation IDs; it does not persist prompts, answers, or station facts.
- Uses Workers AI model `@cf/zai-org/glm-4.7-flash`.
- Accepts a question (max 1,600 chars) and optional precomputed facts (max 5,000 chars).
- The system prompt treats application KPI as authoritative and disallows recalculation, invented facts, HTML, and out-of-scope advice.
- CORS allows only exact origins listed in `ALLOWED_ORIGINS`.

## Test Worker bindings/secrets
- AI binding
- Durable Object binding `QUOTAS` to class `QuotaManager`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable/anon key only)
- `ALLOWED_ORIGINS` (comma-separated exact HTTPS origins)
- Optional `GLOBAL_DAILY_LIMIT` (test configuration default: 250)

Never put service-role keys or other secrets in source control. The production Worker has its own Cloudflare-managed bindings and secrets and must not be deployed from this test configuration.

## Local tests
Run `npm test` from this directory. The quota test suite covers concurrent per-user limits, global limits, reservation refunds, exactly-once finalization, and cross-user refund protection.

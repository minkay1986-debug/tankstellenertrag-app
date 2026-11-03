# TankstellenErtrag AI Advisor – isolated pilot

This Worker is a test-only server endpoint. It is not deployed and is not wired into the live app.

## Security and behavior
- Validates the Supabase access token against the Supabase Auth user endpoint.
- Uses the verified Supabase user UUID as the quota key; ignores any client-supplied identity.
- Enforces 3 successful request reservations per user per Europe/Berlin calendar day using Durable Object storage transactions.
- Enforces a global daily cap (default 250 reservations) before calling Workers AI.
- Uses Workers AI model `@cf/zai-org/glm-4.7-flash`.
- Accepts only a question (max 1,600 chars) and optional precomputed facts (max 5,000 chars).
- Prompt explicitly treats KPI as authoritative and disallows recalculation, invented facts, HTML, and out-of-scope advice.
- Does not persist prompts or responses.

## Required bindings/secrets
- AI binding
- Durable Object bindings USER_QUOTAS and GLOBAL_QUOTA
- SUPABASE_URL
- SUPABASE_ANON_KEY (publishable/anon key only)
- ALLOWED_ORIGINS (comma-separated exact HTTPS origins)
- Optional GLOBAL_DAILY_LIMIT

## Important review items before deployment
The two Durable Object bindings intentionally use the same class but separate namespaces. Confirm the Cloudflare account's current Durable Object migration/binding configuration before deployment. Add an explicit rollback/refund strategy for reservations if inference fails before enabling this for customers. Configure observability and a hard billing alert/limit in Cloudflare as a separate account-level safeguard.

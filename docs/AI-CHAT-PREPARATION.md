# AI chat preparation (not connected)

Status: preparation only. This branch is not deployed and does not change the existing chat, live application, Supabase database, or production secrets.

## Goal
Prepare a provider-neutral boundary for a possible future AI fallback in the existing rule-based advisory chat. Deterministic calculations remain in application code. AI may explain validated, already-computed facts and reason across categories; it must not calculate authoritative business figures or invent missing values.

## Safety gates
- Feature remains disabled by default (`AI_CHAT_ENABLED=false`).
- No model/provider call, API key, Supabase migration, deployment, or production write is included in this preparation.
- Use synthetic/fabricated station data for all first tests.
- Do not send customer data to a free-tier provider. Review the provider's current privacy terms, regional conditions, and pricing before any live integration.
- Existing rule-based chat remains the fallback and must continue working when AI is disabled, unavailable, timed out, or quota-exhausted.

## Input/data quality contract
Represent data state explicitly; never infer state from a numeric value alone:
- `missing`: not entered / not available.
- `entered_zero`: explicitly entered numeric zero; valid for measures such as shrinkage or write-offs, but may trigger a plausibility check for purchase cost.
- `entered_value`: a finite value has been entered.
- `unverified_import`: imported data has not been confirmed.

Block only the analysis that depends on missing or invalid data. For example, a missing group purchase cost blocks that group's margin analysis, not unrelated sales analysis. A missing comparison period blocks the comparison, not the current-period view.

## Future architecture (not implemented here)
1. Browser keeps current deterministic chat behavior and requests AI only for eligible questions.
2. Authenticated Supabase Edge Function is the only provider boundary. Never put provider keys in browser code.
3. Validate the caller, question length, allowed context fields, and data quality on the server.
4. Enforce at most 3 successful/accepted AI questions per station per calendar month with a server-side atomic quota operation; client-side counters are not security controls. Define whether failed provider requests consume quota before implementation.
5. Apply rate limiting, timeout, bounded input/output tokens, response-size checks, duplicate-request protection, and generic errors that do not leak secrets.
6. Log minimal usage metadata only (station reference, month, count, model, token/cost metadata); avoid logging question text or business figures by default.
7. Cache identical eligible requests only after privacy and invalidation rules are defined. Never return cached answers across stations.
8. Keep the feature flag off until tests, provider/privacy review, quota enforcement, and explicit go-live approval are complete.

## Initial acceptance tests
- AI is off by default and no provider request is made.
- Blank/oversized questions are rejected.
- Missing values differ from explicit zero.
- Invalid numbers (NaN/Infinity) are rejected.
- Missing group EK blocks only margin-dependent analysis.
- Current-period analysis remains available when prior-period data is missing.
- Quota limit is enforced server-side atomically before a provider request.
- Existing rule-based answers continue to work if the provider errors or times out.

## Current implementation in this branch
Only provider-neutral input/data-quality helpers and their unit tests are added. No endpoint is deployable, no provider is selected, and no model is called.

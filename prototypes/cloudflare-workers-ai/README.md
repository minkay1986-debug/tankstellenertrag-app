# Cloudflare Workers AI – isolated prototype

This folder is an experimental server-side prototype only. It is not imported by the app, not deployed, and does not change the live site.

## Initial model

The prototype uses `@cf/zai-org/glm-4.7-flash`, which Cloudflare currently lists among models available on the Workers Free plan. Model availability, limits, and terms must be checked again when setting up the account.

## Safe test setup

1. Create a separate Cloudflare test Worker, not a production Worker.
2. Add the Workers AI binding named `AI`.
3. Set the ordinary environment variable `AI_PROTOTYPE_ENABLED=true` only in the test Worker.
4. Set `PROTOTYPE_TEST_TOKEN` as a Cloudflare secret using a newly generated random token. Never commit it to Git or place it in browser code.
5. Deploy only to the private/test environment and do not connect it to the production app.
6. Send only requests with `testMode: true` and `syntheticContext.synthetic: true`.
7. Start with synthetic questions and fake values; never send station, employee, customer, or other confidential data.
8. If the free quota is exhausted, the endpoint should return an error and must not fall back to a paid path.

Example request body (all values fictional):

```json
{
  "testMode": true,
  "question": "Warum bleibt von meinem Umsatz so wenig übrig?",
  "syntheticContext": {
    "synthetic": true,
    "period": "Fiktiver Testmonat",
    "shopRevenueEur": 10000,
    "shopGrossProfitEur": 2500,
    "groups": [
      {
        "name": "Backwaren",
        "revenueEur": 1200,
        "marginPercent": 31,
        "dataStatus": "valid"
      },
      {
        "name": "Getränke",
        "revenueEur": 1800,
        "marginPercent": null,
        "dataStatus": "missing"
      },
      {
        "name": "Kaffee",
        "revenueEur": 900,
        "marginPercent": 0,
        "dataStatus": "entered_zero"
      }
    ]
  }
}
```

## Guardrails and limits

- Disabled unless `AI_PROTOTYPE_ENABLED=true`.
- Requires a separate bearer token.
- Maximum question length: 1,000 characters.
- Accepts only explicitly labelled synthetic test context.
- Sends only an allowlisted, bounded subset of fields to the model.
- Maximum generated output: 350 tokens.
- No conversation history, database access, Supabase credentials, or customer records.
- Provider errors are reduced to generic responses.
- The future product limit of three successful AI questions per station/month is not implemented here; it belongs in the authenticated production backend and must be enforced atomically.

## Automated tests

Run the local safety tests with Node.js 24 or newer:

```sh
npm test
```

The test suite covers disabled-by-default behavior, route/method checks, token authentication, malformed JSON, blank/overlong questions, explicit synthetic-test mode, missing AI binding, field allowlisting, preservation of valid zero values, provider failures, empty responses, and the successful response shape. The tests mock the AI binding and do not call Cloudflare or require API credentials.

GitHub Actions runs this suite when files in this prototype change or when the draft PR is updated. This CI workflow has been added but has not yet been observed completing successfully; check its run status before relying on it.

## Next validation

Run the automated tests and review the CI result. Then compare AI responses with the current rule-based chat using synthetic German questions and a fixed scoring rubric. Check the provider's current terms and data handling before sending any non-synthetic information. Do not connect the prototype to the live app.

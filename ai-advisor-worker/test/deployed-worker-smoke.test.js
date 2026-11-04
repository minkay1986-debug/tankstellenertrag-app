import test from "node:test";
import assert from "node:assert/strict";

const endpoint = process.env.TSE_ADVISOR_TEST_URL;
const origins = [
  "http://localhost:4173",
  "https://feature-ai-advisor-chat-pilo.tankstellenertrag-preview.pages.dev"
];

test("deployed isolated Worker accepts only configured test origins and rejects unauthenticated calls", { skip: !endpoint }, async () => {
  for (const origin of origins) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ question: "Synthetic smoke test", facts: "No customer data." })
    });
    assert.equal(response.status, 401, origin);
    assert.equal(response.headers.get("access-control-allow-origin"), origin, origin);
    const body = await response.json();
    assert.equal(body.error, "unauthorized", origin);
  }
});

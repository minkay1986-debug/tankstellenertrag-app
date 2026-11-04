import test from "node:test";
import assert from "node:assert/strict";

const endpoint = process.env.TSE_ADVISOR_TEST_URL;

test("deployed isolated Worker accepts test origin and rejects unauthenticated calls", { skip: !endpoint }, async () => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { origin: "http://localhost:4173", "content-type": "application/json" },
    body: JSON.stringify({ question: "Synthetic smoke test", facts: "No customer data." })
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:4173");
  const body = await response.json();
  assert.equal(body.error, "unauthorized");
});

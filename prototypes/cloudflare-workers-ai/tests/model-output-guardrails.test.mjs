import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const token = "synthetic-test-token";

function request(body) {
  return new Request("https://test.invalid/prototype/ask", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const body = {
  testMode: true,
  question: "Warum fehlt die Getränke-Marge?",
  syntheticContext: {
    synthetic: true,
    period: "Fiktiver September",
    shopRevenueEur: 10000,
    shopGrossProfitEur: 2500,
    groups: [
      { name: "Getränke", revenueEur: 1800, marginPercent: null, dataStatus: "missing" },
      { name: "Kaffee", revenueEur: 900, marginPercent: 0, dataStatus: "entered_zero" },
    ],
  },
};

test("GLM reasoning is disabled and cleared so final answers are not lost to the token budget", async () => {
  let captured;
  const env = {
    AI_PROTOTYPE_ENABLED: "true",
    PROTOTYPE_TEST_TOKEN: token,
    AI: { run: async (_model, input) => { captured = input; return { response: "Die Getränke-Marge fehlt." }; } },
  };
  const response = await worker.fetch(request(body), env);
  assert.equal(response.status, 200);
  assert.deepEqual(captured.chat_template_kwargs, { enable_thinking: false, clear_thinking: true });
});

test("system prompt explicitly blocks unsupported loss, missing-field and order inferences", async () => {
  let captured;
  const env = {
    AI_PROTOTYPE_ENABLED: "true",
    PROTOTYPE_TEST_TOKEN: token,
    AI: { run: async (_model, input) => { captured = input; return { response: "Die Getränke-Marge fehlt." }; } },
  };
  await worker.fetch(request(body), env);
  const systemPrompt = captured.messages.find((message) => message.role === "system")?.content ?? "";
  assert.match(systemPrompt, /Ein Umsatz ist kein Verlust/);
  assert.match(systemPrompt, /Bei dataStatus=missing ist nur der angegebene Datenstatus bekannt/);
  assert.match(systemPrompt, /Erfinde keine Bestellmenge/);
  assert.match(systemPrompt, /Eine Marge von 0 % ist ein erfasster Wert/);
});

import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const token = "synthetic-test-token";

function request({ method = "POST", path = "/prototype/ask", body, authorization = `Bearer ${token}` } = {}) {
  return new Request(`https://test.invalid${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(authorization === null ? {} : { authorization }),
    },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

function validBody(overrides = {}) {
  return {
    testMode: true,
    question: "Warum bleibt von meinem Umsatz so wenig übrig?",
    syntheticContext: {
      synthetic: true,
      period: "Fiktiver Testmonat",
      shopRevenueEur: 10000,
      shopGrossProfitEur: 2500,
      groups: [
        { name: "Backwaren", revenueEur: 1200, marginPercent: 31, dataStatus: "valid" },
        { name: "Getränke", revenueEur: 1800, marginPercent: null, dataStatus: "missing" },
        { name: "Kaffee", revenueEur: 900, marginPercent: 0, dataStatus: "entered_zero" },
      ],
    },
    ...overrides,
  };
}

function fakeEnv(overrides = {}) {
  return {
    AI_PROTOTYPE_ENABLED: "true",
    PROTOTYPE_TEST_TOKEN: token,
    AI: {
      run: async (_model, input) => ({
        response: "Der Rohertrag beträgt laut Testdaten 2.500 Euro. Für Getränke fehlt die Margeninformation.",
        capturedInput: input,
      }),
    },
    ...overrides,
  };
}

test("disabled by default: no model call when feature flag is absent", async () => {
  let called = false;
  const env = { AI: { run: async () => { called = true; return { response: "unexpected" }; } } };
  const response = await worker.fetch(request({ body: validBody() }), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "prototype_disabled" });
  assert.equal(called, false);
});

test("rejects requests to unsupported routes and methods", async () => {
  assert.equal((await worker.fetch(request({ method: "GET" }), fakeEnv())).status, 404);
  assert.equal((await worker.fetch(request({ path: "/other", body: validBody() }), fakeEnv())).status, 404);
});

test("requires the dedicated prototype token", async () => {
  const response = await worker.fetch(request({ body: validBody(), authorization: "Bearer wrong-token" }), fakeEnv());
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("rejects missing authorization", async () => {
  const response = await worker.fetch(request({ body: validBody(), authorization: null }), fakeEnv());
  assert.equal(response.status, 401);
});

test("rejects malformed JSON", async () => {
  const response = await worker.fetch(request({ body: "{not-json" }), fakeEnv());
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_json" });
});

test("rejects blank and overlong questions", async () => {
  const blank = await worker.fetch(request({ body: validBody({ question: "  " }) }), fakeEnv());
  assert.equal(blank.status, 400);
  assert.deepEqual(await blank.json(), { error: "invalid_question" });

  const long = await worker.fetch(request({ body: validBody({ question: "x".repeat(1001) }) }), fakeEnv());
  assert.equal(long.status, 400);
  assert.deepEqual(await long.json(), { error: "invalid_question" });
});

test("requires explicit synthetic test mode", async () => {
  const noTestMode = await worker.fetch(request({ body: validBody({ testMode: false }) }), fakeEnv());
  assert.equal(noTestMode.status, 400);
  assert.deepEqual(await noTestMode.json(), { error: "synthetic_test_data_required" });

  const noSyntheticMarker = await worker.fetch(request({
    body: validBody({ syntheticContext: { synthetic: false } }),
  }), fakeEnv());
  assert.equal(noSyntheticMarker.status, 400);
});

test("rejects a missing AI binding without leaking internals", async () => {
  const response = await worker.fetch(request({ body: validBody() }), fakeEnv({ AI: undefined }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "workers_ai_binding_missing" });
});

test("passes only allowlisted bounded synthetic fields to the model", async () => {
  let captured;
  const env = fakeEnv({
    AI: {
      run: async (_model, input) => {
        captured = input;
        return { response: "Antwort auf Basis der Testdaten." };
      },
    },
  });
  const body = validBody({
    syntheticContext: {
      synthetic: true,
      period: "Fiktiver Testmonat",
      shopRevenueEur: 1234,
      shopGrossProfitEur: 321,
      groups: [{
        name: "Testgruppe",
        revenueEur: 100,
        marginPercent: 0,
        dataStatus: "entered_zero",
        privateNotes: "MUST NOT BE SENT",
        customerEmail: "customer@example.invalid",
      }],
      stationName: "REAL STATION NAME MUST NOT BE SENT",
    },
    customerEmail: "should-not-be-sent@example.invalid",
  });
  const response = await worker.fetch(request({ body }), env);
  assert.equal(response.status, 200);
  const serialized = JSON.stringify(captured);
  assert.match(serialized, /Testgruppe/);
  assert.doesNotMatch(serialized, /MUST NOT BE SENT|customer@example|REAL STATION NAME|should-not-be-sent/);
  assert.equal(captured.messages[1].content.includes('"marginPercent":0'), true);
  assert.equal(captured.messages[1].content.includes('"dataStatus":"entered_zero"'), true);
});

test("returns a generic error if model inference throws", async () => {
  const env = fakeEnv({ AI: { run: async () => { throw new Error("private provider details"); } } });
  const response = await worker.fetch(request({ body: validBody() }), env);
  assert.equal(response.status, 502);
  const payload = await response.text();
  assert.equal(payload, JSON.stringify({ error: "model_unavailable" }));
  assert.doesNotMatch(payload, /private provider details/);
});

test("rejects empty model output", async () => {
  const env = fakeEnv({ AI: { run: async () => ({ response: "   " }) } });
  const response = await worker.fetch(request({ body: validBody() }), env);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "empty_model_response" });
});

test("returns the model answer and model identifier on success", async () => {
  const response = await worker.fetch(request({ body: validBody() }), fakeEnv());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.answer, "Der Rohertrag beträgt laut Testdaten 2.500 Euro. Für Getränke fehlt die Margeninformation.");
  assert.equal(payload.model, "@cf/zai-org/glm-4.7-flash");
  assert.equal(payload.prototype, true);
});


test("system prompt requires natural understanding, targeted clarification, and evidence boundaries", async () => {
  let captured;
  const env = fakeEnv({
    AI: {
      run: async (_model, input) => {
        captured = input;
        return { response: "Meinst du den Umsatz oder den Rohertrag?" };
      },
    },
  });
  const response = await worker.fetch(request({
    body: validBody({ question: "Warum bleibt so wenig hängen?" }),
  }), env);
  assert.equal(response.status, 200);
  const systemPrompt = captured.messages.find(message => message.role === "system")?.content ?? "";
  assert.match(systemPrompt, /Alltagssprache/);
  assert.match(systemPrompt, /genau eine kurze, hilfreiche Rückfrage/);
  assert.match(systemPrompt, /Erfinde keine Zahlen/);
  assert.match(systemPrompt, /Ein fehlender Einkaufspreis ist nicht dasselbe wie null Einkaufskosten/);
  assert.match(systemPrompt, /keine Ursache/);
});

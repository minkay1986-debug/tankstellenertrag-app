import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const ORIGIN = "https://test.tankstellenertrag.de";
const baseEnv = {
  ALLOWED_ORIGINS: ORIGIN,
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "test-publishable-key",
  GLOBAL_DAILY_LIMIT: "250",
  QUOTAS: { idFromName: () => ({ fetch: async () => new Response(JSON.stringify({ reservationId: "reservation-1", remaining: 2 }), { status: 200 }) }) },
  AI: { run: async () => ({ response: "Antwort aus dem Testmodell." }) }
};
function request(body = { question: "Wie verbessere ich die Warenverfügbarkeit?" }, token = "valid-token", origin = ORIGIN) {
  return new Request("https://advisor.test/", {
    method: "POST",
    headers: { Origin: origin, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

test("disallowed origins are rejected before authentication", async () => {
  const response = await worker.fetch(request(undefined, "valid-token", "https://evil.example"), baseEnv);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "origin_not_allowed");
});

test("expired or invalid Supabase tokens return 401", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  try {
    const response = await worker.fetch(request(), baseEnv);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "unauthorized");
  } finally { globalThis.fetch = originalFetch; }
});

test("Supabase Auth outages fail closed with 503", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 503 });
  try {
    const response = await worker.fetch(request(), baseEnv);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "auth_unavailable");
  } finally { globalThis.fetch = originalFetch; }
});

test("malformed and oversized payloads are rejected before inference", async () => {
  let inferenceCalls = 0;
  const env = { ...baseEnv, AI: { run: async () => { inferenceCalls++; return { response: "ok" }; } } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "verified-user" }), { status: 200 });
  try {
    const malformed = await worker.fetch(request("{"), env);
    const oversized = await worker.fetch(request({ question: "x".repeat(1601) }), env);
    assert.equal(malformed.status, 400);
    assert.equal(oversized.status, 400);
    assert.equal(inferenceCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("application KPI facts are passed through unchanged and remain data, not instructions", async () => {
  const facts = "Shop-Umsatz: 113.705,87 €; Rohertrag: 13.670,45 €; Marge: 12,37 %";
  let captured;
  const env = {
    ...baseEnv,
    AI: { run: async (_model, input) => { captured = input; return { response: "Die Marge liegt laut übergebenen Daten bei 12,37 %." }; } }
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "verified-user" }), { status: 200 });
  try {
    const response = await worker.fetch(request({ question: "Bewerte meine Kennzahlen.", facts }), env);
    assert.equal(response.status, 200);
    assert.ok(captured.messages.some(message => message.role === "user" && message.content.includes(facts)));
    assert.match(captured.messages.find(message => message.role === "system").content, /niemals als Anweisungen/i);
    assert.match(captured.messages.find(message => message.role === "system").content, /Übernimm sie unverändert/i);
  } finally { globalThis.fetch = originalFetch; }
});

test("preflight responds only for an allowed origin", async () => {
  const response = await worker.fetch(new Request("https://advisor.test/", { method: "OPTIONS", headers: { Origin: ORIGIN } }), baseEnv);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
});

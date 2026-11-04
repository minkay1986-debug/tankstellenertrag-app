import test from "node:test";
import assert from "node:assert/strict";
import { QuotaManager } from "../src/index.js";

class MemoryStorage {
  constructor() { this.values = new Map(); this.tail = Promise.resolve(); }
  transaction(callback) {
    const run = this.tail.then(() => callback({
      get: async key => this.values.get(key),
      put: async (key, value) => { this.values.set(key, structuredClone(value)); }
    }));
    this.tail = run.catch(() => {});
    return run;
  }
}
function setup() {
  const manager = new QuotaManager({ storage: new MemoryStorage() });
  const call = async body => manager.fetch(new Request("https://quota.test", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  }));
  return { call };
}
const reserve = (userId, globalLimit = 250) => ({
  action: "reserve", day: "2026-11-04", userId, userLimit: 3, globalLimit
});
const finalize = (action, userId, reservationId) => ({
  action, day: "2026-11-04", userId, reservationId
});

test("three concurrent requests for one user are the maximum", async () => {
  const { call } = setup();
  const responses = await Promise.all(Array.from({ length: 8 }, () => call(reserve("user-a"))));
  assert.equal(responses.filter(response => response.status === 200).length, 3);
  assert.equal(responses.filter(response => response.status === 429).length, 5);
});

test("user limit is checked before global capacity is consumed", async () => {
  const { call } = setup();
  const first = await call(reserve("user-a", 4));
  const second = await call(reserve("user-a", 4));
  const third = await call(reserve("user-a", 4));
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 200);
  assert.equal((await call(reserve("user-a", 4))).status, 429);
  const otherUser = await call(reserve("user-b", 4));
  assert.equal(otherUser.status, 200);
});

test("global limit applies across users", async () => {
  const { call } = setup();
  assert.equal((await call(reserve("user-a", 2))).status, 200);
  assert.equal((await call(reserve("user-b", 2))).status, 200);
  const blocked = await call(reserve("user-c", 2));
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, "service_daily_limit_reached");
});

test("failed inference reservation can be refunded exactly once", async () => {
  const { call } = setup();
  const reserved = await (await call(reserve("user-a"))).json();
  assert.ok(reserved.reservationId);
  assert.equal((await call(finalize("refund", "user-a", reserved.reservationId))).status, 200);
  const duplicateRefund = await (await call(finalize("refund", "user-a", reserved.reservationId))).json();
  assert.equal(duplicateRefund.status, "already_finalized");
  const next = await call(reserve("user-a"));
  assert.equal(next.status, 200);
});

test("a reservation cannot be refunded by another user", async () => {
  const { call } = setup();
  const reserved = await (await call(reserve("user-a"))).json();
  const forbidden = await call(finalize("refund", "user-b", reserved.reservationId));
  assert.equal(forbidden.status, 403);
  assert.equal((await call(reserve("user-a"))).status, 200);
});

test("successful completion consumes the reservation and cannot be refunded later", async () => {
  const { call } = setup();
  const reserved = await (await call(reserve("user-a"))).json();
  const completed = await (await call(finalize("complete", "user-a", reserved.reservationId))).json();
  assert.equal(completed.status, "completed");
  const refund = await (await call(finalize("refund", "user-a", reserved.reservationId))).json();
  assert.equal(refund.status, "already_finalized");
  const afterThree = await Promise.all([call(reserve("user-a")), call(reserve("user-a"))]);
  assert.equal(afterThree.filter(response => response.status === 200).length, 1);
});

test("malformed quota requests are rejected", async () => {
  const { call } = setup();
  assert.equal((await call({ action: "reserve", day: "not-a-date", userId: "u", userLimit: 3, globalLimit: 5 })).status, 400);
  assert.equal((await call({ action: "unknown" })).status, 400);
});

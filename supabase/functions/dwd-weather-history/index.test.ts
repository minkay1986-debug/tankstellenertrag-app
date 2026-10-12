import { handler } from "./index.ts";

const origin = "https://app.tankstellenertrag.de";

Deno.test("rejects unapproved origins before upstream requests", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: "https://example.invalid", Authorization: "Bearer test" },
    body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-01-01", end_date: "2025-01-03" }),
  }));
  if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
});

Deno.test("rejects invalid dates without calling DWD", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-02-30", end_date: "2025-03-01" }),
  }));
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
});

Deno.test({
  name: "DWD historical integration: downloads, unzips and parses real daily observations",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const response = await handler(new Request("https://local.test", {
      method: "POST",
      headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 49.3,
        longitude: 10.8,
        start_date: "2025-01-01",
        end_date: "2025-01-03",
      }),
    }));
    const payload = await response.json();
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(payload)}`);
    }
    if (payload.source !== "DWD CDC Tageswerte") throw new Error("Unexpected source marker");
    if (!/^\d{5}$/.test(payload.station_id)) throw new Error("Missing DWD station ID");
    if (!Array.isArray(payload.daily) || payload.daily.length === 0) throw new Error("No daily observations returned");
    if (payload.daily.some((row: Record<string, unknown>) => typeof row.date !== "string")) {
      throw new Error("Daily observation is missing its date");
    }
    if (payload.daily.some((row: Record<string, unknown>) => typeof row.date !== "string" || row.date < "2025-01-01" || row.date > "2025-01-03")) {
      throw new Error("Returned dates escaped the requested range");
    }
    console.log(JSON.stringify({
      integration: "passed",
      station_id: payload.station_id,
      approximate_distance_km: payload.approximate_distance_km,
      days_returned: payload.days_returned,
      coverage_percent: payload.coverage_percent,
      summary: payload.summary,
    }));
  },
});

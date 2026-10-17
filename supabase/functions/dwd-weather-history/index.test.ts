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
    if (typeof payload.approximate_distance_km !== "number" || payload.approximate_distance_km > 100) {
      throw new Error(`Selected station is implausibly far away: ${payload.station_id}, ${payload.approximate_distance_km} km`);
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

Deno.test({
  name: "DWD historical integration: selects a nearby station for a second region and older period",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const response = await handler(new Request("https://local.test", {
      method: "POST",
      headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 52.52,
        longitude: 13.405,
        start_date: "2010-01-01",
        end_date: "2010-01-03",
      }),
    }));
    const payload = await response.json();
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(payload)}`);
    }
    if (typeof payload.approximate_distance_km !== "number" || payload.approximate_distance_km > 100) {
      throw new Error(`Selected station is implausibly far from Berlin: ${payload.station_id}, ${payload.approximate_distance_km} km`);
    }
    if (!Array.isArray(payload.daily) || payload.daily.length === 0) {
      throw new Error("No historical observations returned for Berlin test");
    }
    if (payload.daily.some((row: Record<string, unknown>) =>
      typeof row.date !== "string" || row.date < "2010-01-01" || row.date > "2010-01-03"
    )) {
      throw new Error("Berlin test returned dates outside the requested range");
    }
    console.log(JSON.stringify({
      integration: "passed",
      region: "Berlin",
      station_id: payload.station_id,
      approximate_distance_km: payload.approximate_distance_km,
      days_returned: payload.days_returned,
      coverage_percent: payload.coverage_percent,
    }));
  },
});

Deno.test({
  name: "DWD recent integration: loads observations from the recent directory",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const response = await handler(new Request("https://local.test", {
      method: "POST",
      headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 49.3,
        longitude: 10.8,
        start_date: "2026-09-25",
        end_date: "2026-09-27",
      }),
    }));
    const payload = await response.json();
    if (response.status !== 200) {
      throw new Error(`Expected 200 for recent DWD data, got ${response.status}: ${JSON.stringify(payload)}`);
    }
    if (typeof payload.approximate_distance_km !== "number" || payload.approximate_distance_km > 100) {
      throw new Error(`Recent-data station is implausibly far away: ${payload.station_id}, ${payload.approximate_distance_km} km`);
    }
    if (!Array.isArray(payload.daily) || payload.daily.length === 0) {
      throw new Error("No recent daily observations returned");
    }
    if (payload.daily.some((row: Record<string, unknown>) =>
      typeof row.date !== "string" || row.date < "2026-09-25" || row.date > "2026-09-27"
    )) {
      throw new Error("Recent test returned dates outside the requested range");
    }
    console.log(JSON.stringify({
      integration: "passed",
      region: "Franconia",
      period: "2026-09-25/2026-09-27",
      station_id: payload.station_id,
      approximate_distance_km: payload.approximate_distance_km,
      days_returned: payload.days_returned,
      coverage_percent: payload.coverage_percent,
    }));
  },
});


Deno.test("rejects missing authorization before calling DWD", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-01-01", end_date: "2025-01-03" }),
  }));
  if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
});

Deno.test("rejects malformed JSON without calling DWD", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
    body: "{not-json",
  }));
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
});

Deno.test("rejects reversed date ranges without calling DWD", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-01-04", end_date: "2025-01-03" }),
  }));
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
});

Deno.test("rejects date ranges longer than ten years without calling DWD", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2000-01-01", end_date: "2011-01-01" }),
  }));
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
});

Deno.test("rejects coordinates outside Germany without calling DWD", async () => {
  const response = await handler(new Request("https://local.test", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: 40.7, longitude: -74, start_date: "2025-01-01", end_date: "2025-01-03" }),
  }));
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
});


Deno.test({
  name: "returns a structured 502 when the DWD station list is unavailable",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("temporarily unavailable", { status: 503 });
    }) as typeof fetch;
    try {
      const response = await handler(new Request("https://local.test", {
        method: "POST",
        headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-01-01", end_date: "2025-01-03" }),
      }));
      const payload = await response.json();
      if (response.status !== 502) throw new Error(`Expected 502, got ${response.status}`);
      if (payload.detail !== "DWD-Stationsliste") throw new Error(`Unexpected error stage: ${payload.detail}`);
      if (calls !== 3) throw new Error(`Expected 3 safe retries, got ${calls}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
});

Deno.test({
  name: "returns a structured 502 when the selected DWD ZIP is corrupt",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("KL_Tageswerte_Beschreibung_Stationen.txt")) {
        return new Response("06158 19510101 20261231 412 49.3000 10.8000 Heilsbronn station fixture\n");
      }
      if (url.endsWith("/historical/")) {
        return new Response('<a href="tageswerte_KL_06158_19510101_20261231_hist.zip">zip</a>');
      }
      if (url.endsWith("/recent/")) return new Response("");
      if (url.endsWith("tageswerte_KL_06158_19510101_20261231_hist.zip")) {
        return new Response("this is not a zip file");
      }
      return new Response("unexpected URL", { status: 404 });
    }) as typeof fetch;
    try {
      const response = await handler(new Request("https://local.test", {
        method: "POST",
        headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-01-01", end_date: "2025-01-03" }),
      }));
      const payload = await response.json();
      if (response.status !== 502) throw new Error(`Expected 502, got ${response.status}: ${JSON.stringify(payload)}`);
      if (!String(payload.detail).startsWith("DWD-ZIP-Datei")) throw new Error(`Unexpected error stage: ${payload.detail}`);
      if (!String(payload.hint).includes("nicht entpackt")) throw new Error(`Unexpected error hint: ${payload.hint}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
});


Deno.test({
  name: "returns a clear error when no station has files for the requested period",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("KL_Tageswerte_Beschreibung_Stationen.txt")) {
        return new Response("06158 19510101 20261231 412 49.3000 10.8000 Heilsbronn station fixture\n");
      }
      if (url.endsWith("/historical/")) return new Response("<html><body>No matching files</body></html>");
      if (url.endsWith("/recent/")) return new Response("<html><body>No recent files</body></html>");
      return new Response("unexpected URL", { status: 404 });
    }) as typeof fetch;
    try {
      const response = await handler(new Request("https://local.test", {
        method: "POST",
        headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: 49.3, longitude: 10.8, start_date: "2025-01-01", end_date: "2025-01-03" }),
      }));
      const payload = await response.json();
      if (response.status !== 502) throw new Error(`Expected 502, got ${response.status}`);
      if (payload.detail !== "DWD-Datenverzeichnis") throw new Error(`Unexpected error stage: ${payload.detail}`);
      if (!String(payload.hint).includes("Keine DWD-Station")) throw new Error(`Unexpected error hint: ${payload.hint}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
});


Deno.test({
  name: "DWD historical integration: accepts a long period spanning historical and recent data",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const start = "2025-10-01";
    const end = "2026-10-13";
    const response = await handler(new Request("https://local.test", {
      method: "POST",
      headers: { Origin: origin, Authorization: "Bearer test", "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 49.3,
        longitude: 10.8,
        start_date: start,
        end_date: end,
      }),
    }));
    const payload = await response.json();
    if (response.status !== 200) {
      throw new Error(`Expected 200 for long date range, got ${response.status}: ${JSON.stringify(payload)}`);
    }
    if (!Array.isArray(payload.daily) || payload.daily.length === 0) {
      throw new Error("Long-period request returned no daily observations");
    }
    if (payload.daily.some((row: Record<string, unknown>) =>
      typeof row.date !== "string" || row.date < start || row.date > end
    )) {
      throw new Error("Long-period request returned dates outside the requested range");
    }
    if (typeof payload.days_returned !== "number" || payload.days_returned < 1) {
      throw new Error("Long-period request returned an invalid days_returned value");
    }
    console.log(JSON.stringify({
      integration: "passed",
      period: `${start}/${end}`,
      station_id: payload.station_id,
      days_returned: payload.days_returned,
      coverage_percent: payload.coverage_percent,
    }));
  },
});

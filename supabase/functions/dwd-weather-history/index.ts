import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { unzipSync } from "npm:fflate@0.8.2";

const DIAGNOSTIC_BUILD = "dwd-history-diag-2026-10-12-a";
console.info("[dwd-weather-history:boot]", { build: DIAGNOSTIC_BUILD });

const allowedOrigins = new Set([
  "https://minkay1986-debug.github.io",
  "https://app.tankstellenertrag.de",
]);
const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://app.tankstellenertrag.de",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "X-DWD-Diagnostic-Build": DIAGNOSTIC_BUILD,
});
const reply = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) });

class UpstreamError extends Error {
  constructor(readonly stage: string, message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

// DWD sometimes responds with transient network/5xx errors. Retry only safe GETs,
// with a timeout and short backoff. Never retry malformed data or client errors.
async function fetchDwd(url: string, stage: string): Promise<Response> {
  let lastError: unknown;
  const parsedUrl = new URL(url);
  console.info("[dwd-weather-history:fetch-start]", { build: DIAGNOSTIC_BUILD, stage, host: parsedUrl.host, path: parsedUrl.pathname });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "TankstellenErtrag-Wetterhistorie/1.0" },
      });
      console.info("[dwd-weather-history:fetch-response]", { build: DIAGNOSTIC_BUILD, stage, attempt: attempt + 1, status: response.status });
      if (response.ok) return response;
      if (response.status < 500 && response.status !== 429) {
        throw new UpstreamError(stage, `DWD antwortete mit HTTP ${response.status}.`);
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      lastError = error;
      console.warn("[dwd-weather-history:fetch-error]", { build: DIAGNOSTIC_BUILD, stage, attempt: attempt + 1, name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unbekannter Fehler" });
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  const detail = lastError instanceof Error ? lastError.message : "Unbekannter Netzwerkfehler";
  throw new UpstreamError(stage, `DWD-Abfrage nach 3 Versuchen fehlgeschlagen: ${detail}`);
}

export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("Origin") || "";
  console.info("[dwd-weather-history:request]", { build: DIAGNOSTIC_BUILD, method: req.method, originAllowed: allowedOrigins.has(origin), hasAuthorization: (req.headers.get("Authorization") || "").startsWith("Bearer ") });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (!allowedOrigins.has(origin)) return reply({ error: "Diese Herkunft ist nicht freigegeben." }, 403, origin);
  if (req.method !== "POST") return reply({ error: "POST erforderlich." }, 405, origin);
  if (!(req.headers.get("Authorization") || "").startsWith("Bearer ")) {
    return reply({ error: "Anmeldung erforderlich." }, 401, origin);
  }

  let body: { latitude?: unknown; longitude?: unknown; start_date?: unknown; end_date?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Ungültige Anfrage." }, 400, origin);
  }

  const lat = Number(body.latitude), lon = Number(body.longitude);
  const start = typeof body.start_date === "string" ? body.start_date : "";
  const end = typeof body.end_date === "string" ? body.end_date : "";
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;

  if (!Number.isFinite(lat) || lat < 47 || lat > 56 || !Number.isFinite(lon) || lon < 5 || lon > 16 ||
      !validDate(start) || !validDate(end) || start > end) {
    return reply({ error: "Standort oder Zeitraum ist ungültig." }, 400, origin);
  }
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (days > 3660) return reply({ error: "Bitte höchstens zehn Jahre je Abfrage auswählen." }, 400, origin);

  let stage = "DWD-Stationsliste";
  console.info("[dwd-weather-history:stage]", { build: DIAGNOSTIC_BUILD, stage });
  try {
    const root = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/";
    const historicalBase = root + "historical/";
    const recentBase = root + "recent/";
    const metaRes = await fetchDwd(historicalBase + "KL_Tageswerte_Beschreibung_Stationen.txt", stage);
    const meta = await metaRes.text();

    const stations: { id: string; distance: number }[] = [];
    for (const line of meta.split(/\r?\n/)) {
      if (line.length < 55) continue;
      const fields = line.trim().split(/\s+/);
      const id = fields[0] || "";
      // DWD station rows contain ID, start/end dates, elevation, latitude,
      // longitude, then station name. Whitespace splitting avoids brittle
      // fixed character offsets while preserving the coordinate field order.
      const coordinateMatch = line.match(/^\s*\d{5}\s+\d{8}\s+\d{8}\s+\S+\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
      const slatText = coordinateMatch?.[1] || "";
      const slonText = coordinateMatch?.[2] || "";
      const slat = Number(slatText), slon = Number(slonText);
      if (!/^\d{5}$/.test(id) || !coordinateMatch ||
          !Number.isFinite(slat) || !Number.isFinite(slon) ||
          slat < 47 || slat > 56 || slon < 5 || slon > 16) continue;
      const distance = Math.hypot((slat - lat) * 111, (slon - lon) * 70);
      stations.push({ id, distance });
    }
    if (!stations.length) {
      throw new UpstreamError(stage, "Die DWD-Stationsliste enthält keine gültigen Stationskoordinaten.");
    }

    stage = "DWD-Datenverzeichnis";
    console.info("[dwd-weather-history:stage]", { build: DIAGNOSTIC_BUILD, stage, stationCount: stations.length });
    const [historicalIndexRes, recentIndexRes] = await Promise.all([
      fetchDwd(historicalBase, stage),
      fetchDwd(recentBase, stage),
    ]);
    const [historicalIndex, recentIndex] = await Promise.all([
      historicalIndexRes.text(),
      recentIndexRes.text(),
    ]);
    const startKey = start.replaceAll("-", ""), endKey = end.replaceAll("-", "");
    const historicalMatches = [...historicalIndex.matchAll(/href="(tageswerte_KL_(\d{5})_(\d{8})_(\d{8})_hist\.zip)"/g)]
      .filter((m) => m[3] <= endKey && m[4] >= startKey);
    const recentMatches = [...recentIndex.matchAll(/href="(tageswerte_KL_(\d{5})_akt\.zip)"/g)];
    const nowKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const recentWindowStart = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10).replaceAll("-", "");
    const allowRecent = endKey >= recentWindowStart && startKey <= nowKey;

    // Select the closest station that actually has a file covering the requested dates.
    // A nearby station that stopped reporting years ago must not block a valid alternative.
    const candidates = stations
      .map((station) => ({
        ...station,
        files: [
          ...historicalMatches.filter((m) => m[2] === station.id)
            .map((m) => ({ name: m[1], url: historicalBase + m[1] })),
          ...(allowRecent ? recentMatches.filter((m) => m[2] === station.id)
            .map((m) => ({ name: m[1], url: recentBase + m[1] })) : []),
        ],
      }))
      .filter((station) => station.files.length > 0)
      .sort((left, right) => left.distance - right.distance);
    const best = candidates[0];
    console.info("[dwd-weather-history:station-selection]", { build: DIAGNOSTIC_BUILD, candidateCount: candidates.length, selectedStation: best?.id ?? null, approximateDistanceKm: best ? Math.round(best.distance) : null, files: best?.files.length ?? 0 });
    if (!best) {
      throw new UpstreamError("DWD-Datenverzeichnis", "Keine DWD-Station mit Daten für den ausgewählten Zeitraum gefunden.");
    }
    const files = best.files;

    const daily: Record<string, unknown>[] = [];
    console.info("[dwd-weather-history:stage]", { build: DIAGNOSTIC_BUILD, stage: "DWD-ZIP-Verarbeitung", fileCount: files.length });
    for (const file of files) {
      stage = `DWD-ZIP-Datei ${file.name}`;
      const res = await fetchDwd(file.url, stage);
      const zipped = new Uint8Array(await res.arrayBuffer());
      let entries: Record<string, Uint8Array>;
      try {
        entries = unzipSync(zipped);
      } catch {
        throw new UpstreamError(stage, "Die geladene DWD-ZIP-Datei konnte nicht entpackt werden.");
      }
      for (const [name, bytes] of Object.entries(entries)) {
        if (!name.endsWith(".txt") || /metadaten/i.test(name)) continue;
        const lines = new TextDecoder().decode(bytes).split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) continue;
        const h = lines[0].split(";").map((x) => x.trim());
        const ix = (key: string) => h.indexOf(key);
        const di = ix("MESS_DATUM"), ti = ix("TMK"), xi = ix("TXK"), ni = ix("TNK"), ri = ix("RSK"), si = ix("SDK");
        if (di < 0) continue;
        for (const line of lines.slice(1)) {
          const c = line.split(";"), raw = c[di] || "";
          const date = raw.length === 8 ? raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8) : "";
          if (date < start || date > end) continue;
          // DWD daily climate parameters TMK/TXK/TNK/RSK/SDK are stored in tenths
          // of their displayed units. Convert to °C, mm and hours before aggregation.
          const v = (i: number) => {
            if (i < 0 || !c[i] || c[i] === "-999" || c[i] === "-9999") return null;
            const rawValue = Number(c[i].replace(",", "."));
            return Number.isFinite(rawValue) ? rawValue / 10 : null;
          };
          daily.push({
            date,
            temp_mean: v(ti),
            temp_max: v(xi),
            temp_min: v(ni),
            precipitation_mm: v(ri),
            sunshine_hours: v(si),
          });
        }
      }
    }

    // Recent files are appended after historical files; keep the last row per date so
    // current DWD corrections take precedence where the date ranges overlap.
    const byDate = new Map<string, Record<string, unknown>>();
    for (const row of daily) byDate.set(String(row.date), row);
    daily.splice(0, daily.length, ...[...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))));
    if (!daily.length) {
      throw new UpstreamError("DWD-Tagesdaten", "Die DWD-Datei enthält keine passenden Tageswerte für den ausgewählten Zeitraum.");
    }

    const avg = (key: string) => {
      const values = daily.map((x) => x[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      return values.length ? Math.round(values.reduce((p, c) => p + c, 0) / values.length * 10) / 10 : null;
    };
    const sum = (key: string) => {
      const values = daily.map((x) => x[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      return values.length ? Math.round(values.reduce((p, c) => p + c, 0) * 10) / 10 : null;
    };

    console.info("[dwd-weather-history:success]", { build: DIAGNOSTIC_BUILD, stationId: best.id, daysReturned: daily.length, coveragePercent: Math.min(100, Math.round(daily.length / days * 100)) });
    return reply({
      source: "DWD CDC Tageswerte",
      station_id: best.id,
      approximate_distance_km: Math.round(best.distance),
      start_date: start,
      end_date: end,
      days_returned: daily.length,
      coverage_percent: Math.min(100, Math.round(daily.length / days * 100)),
      summary: {
        temp_mean_c: avg("temp_mean"),
        temp_max_mean_c: avg("temp_max"),
        temp_min_mean_c: avg("temp_min"),
        precipitation_total_mm: sum("precipitation_mm"),
        sunshine_total_hours: sum("sunshine_hours"),
      },
      daily,
    }, 200, origin);
  } catch (error) {
    const stageName = error instanceof UpstreamError ? error.stage : stage;
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("[dwd-weather-history:error]", { build: DIAGNOSTIC_BUILD, stage: stageName, name: error instanceof Error ? error.name : "UnknownError", message, stack: error instanceof Error ? error.stack?.slice(0, 3000) : undefined });
    return reply({
      error: "Historische DWD-Daten konnten nicht geladen werden.",
      detail: stageName,
      hint: message,
    }, 502, origin);
  }
}

if (import.meta.main) Deno.serve(handler);

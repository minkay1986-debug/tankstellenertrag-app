import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { unzipSync } from "npm:fflate@0.8.2";

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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "TankstellenErtrag-Wetterhistorie/1.0" },
      });
      if (response.ok) return response;
      if (response.status < 500 && response.status !== 429) {
        throw new UpstreamError(stage, `DWD antwortete mit HTTP ${response.status}.`);
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      lastError = error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  const detail = lastError instanceof Error ? lastError.message : "Unbekannter Netzwerkfehler";
  throw new UpstreamError(stage, `DWD-Abfrage nach 3 Versuchen fehlgeschlagen: ${detail}`);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
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
  try {
    const root = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/";
    const historicalBase = root + "historical/";
    const recentBase = root + "recent/";
    const metaRes = await fetchDwd(historicalBase + "KL_Tageswerte_Beschreibung_Stationen.txt", stage);
    const meta = await metaRes.text();

    let best: { id: string; distance: number } | null = null;
    for (const line of meta.split(/\r?\n/)) {
      if (line.length < 55) continue;
      const id = line.slice(0, 5).trim();
      const from = line.slice(6, 14).trim(), to = line.slice(15, 23).trim();
      const slat = Number(line.slice(31, 39).trim().replace(",", "."));
      const slon = Number(line.slice(39, 48).trim().replace(",", "."));
      if (!/^\d+$/.test(id) || !Number.isFinite(slat) || !Number.isFinite(slon)) continue;
      const distance = Math.hypot((slat - lat) * 111, (slon - lon) * 70);
      if (!best || distance < best.distance) best = { id, distance };
    }
    if (!best) {
      throw new UpstreamError(stage, "Keine passende historische DWD-Station für Standort und Zeitraum gefunden.");
    }

    stage = "DWD-Datenverzeichnis";
    const historicalIndexRes = await fetchDwd(historicalBase, stage);
    const historicalIndex = await historicalIndexRes.text();
    const historicalFiles = [...historicalIndex.matchAll(/href="(tageswerte_KL_(\d{5})_(\d{8})_(\d{8})_hist\.zip)"/g)]
      .filter((m) => m[2] === best!.id && m[3] <= end.replaceAll("-", "") && m[4] >= start.replaceAll("-", ""))
      .map((m) => ({ name: m[1], url: historicalBase + m[1] }));

    // The DWD publishes the most recent daily observations separately in /recent/.
    // Include the station's current ZIP and let the row-date filter select the requested period.
    const recentIndexRes = await fetchDwd(recentBase, stage);
    const recentIndex = await recentIndexRes.text();
    const recentFiles = [...recentIndex.matchAll(/href="(tageswerte_KL_(\d{5})_akt\.zip)"/g)]
      .filter((m) => m[2] === best!.id)
      .map((m) => ({ name: m[1], url: recentBase + m[1] }));
    const files = [...historicalFiles, ...recentFiles];
    if (!files.length) {
      throw new UpstreamError(stage, "Für die nächste Station sind keine passenden historischen oder aktuellen DWD-Dateien verfügbar.");
    }

    const daily: Record<string, unknown>[] = [];
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
          const v = (i: number) => i >= 0 && c[i] && c[i] !== "-999" ? Number(c[i].replace(",", ".")) : null;
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
    console.error("[dwd-weather-history]", { stage: stageName, message });
    return reply({
      error: "Historische DWD-Daten konnten nicht geladen werden.",
      detail: stageName,
      hint: message,
    }, 502, origin);
  }
});

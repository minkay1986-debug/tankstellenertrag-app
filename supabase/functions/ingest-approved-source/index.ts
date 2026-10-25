import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const ALLOWED = {
  "uniti-publications": { publisher: "UNITI Bundesverband EnergieMittelstand e.V.", hosts: ["uniti.de", "www.uniti.de"] },
  "bft": { publisher: "Bundesverband Freier Tankstellen e.V.", hosts: ["bft.de", "www.bft.de"] },
};
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 10_000;
const cors = {
  "Access-Control-Allow-Origin": "https://app.tankstellenertrag.de",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-knowledge-ingest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const expectedSecret = Deno.env.get("KNOWLEDGE_INGEST_SECRET");
  if (!expectedSecret || req.headers.get("x-knowledge-ingest-secret") !== expectedSecret) return json({ error: "unauthorized" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server_not_configured" }, 500);

  let body: { source_id?: unknown; url?: unknown };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const sourceId = typeof body.source_id === "string" ? body.source_id : "";
  const target = typeof body.url === "string" ? body.url : "";
  const source = ALLOWED[sourceId as keyof typeof ALLOWED];
  if (!source) return json({ error: "source_not_allowlisted" }, 400);
  let parsed: URL;
  try { parsed = new URL(target); } catch { return json({ error: "invalid_url" }, 400); }
  if (parsed.protocol !== "https:" || !source.hosts.includes(parsed.hostname) || parsed.username || parsed.password) return json({ error: "url_not_allowlisted" }, 400);

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: sourceError } = await client.from("tankstellen_knowledge_sources").upsert({
    id: sourceId, publisher: source.publisher, start_url: target, allowed_hosts: source.hosts,
    scope: "Öffentliche Fachinformationen zu Tankstellenbetrieb und Warenwirtschaft"
  }, { onConflict: "id" });
  if (sourceError) return json({ error: "source_store_failed" }, 500);

  let robots: string;
  try {
    const robotsResponse = await fetch("https://" + parsed.hostname + "/robots.txt", { signal: AbortSignal.timeout(TIMEOUT_MS) });
    robots = robotsResponse.ok ? await robotsResponse.text() : "";
  } catch { return json({ error: "robots_check_unavailable" }, 422); }
  if (isRobotsBlocked(robots, parsed.pathname)) return json({ error: "robots_disallows_path" }, 403);

  let response: Response;
  try {
    response = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "TankstellenErtrag-FachwissenBot/0.1 (public source indexing)" } });
  } catch { return json({ error: "source_fetch_failed" }, 502); }
  if (response.status >= 300 && response.status < 400) return json({ error: "redirect_not_followed" }, 422);
  if (!response.ok) return json({ error: "source_http_error", status: response.status }, 502);
  if (!source.hosts.includes(new URL(response.url).hostname)) return json({ error: "offsite_response_blocked" }, 403);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return json({ error: "html_only" }, 415);
  if (Number(response.headers.get("content-length") || "0") > MAX_BYTES) return json({ error: "source_too_large" }, 413);
  const html = await response.text();
  if (new TextEncoder().encode(html).length > MAX_BYTES) return json({ error: "source_too_large" }, 413);

  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || parsed.hostname).replace(/\s+/g, " ").trim().slice(0, 240);
  const text = htmlToText(html);
  if (text.length < 250) return json({ error: "not_enough_readable_text" }, 422);
  const canonicalUrl = new URL(response.url); canonicalUrl.hash = "";
  const { data: doc, error: docError } = await client.from("tankstellen_knowledge_documents").upsert({
    source_id: sourceId, canonical_url: canonicalUrl.toString(), title, publisher: source.publisher,
    content_hash: await sha256(text), review_status: "pending_review", content_text: text.slice(0, 200000),
    metadata: { ingest_method: "allowlisted_html", content_type: contentType, fetched_at: new Date().toISOString() },
  }, { onConflict: "canonical_url" }).select("id").single();
  if (docError || !doc?.id) return json({ error: "document_store_failed" }, 500);

  const chunks = splitChunks(text, 1000, 120).map((content, chunk_index) => ({ document_id: doc.id, chunk_index, content }));
  const { error: deleteError } = await client.from("tankstellen_knowledge_chunks").delete().eq("document_id", doc.id);
  if (deleteError) return json({ error: "old_chunks_replace_failed" }, 500);
  const { error: chunkError } = await client.from("tankstellen_knowledge_chunks").insert(chunks);
  if (chunkError) return json({ error: "chunk_store_failed" }, 500);
  return json({ status: "pending_review", source_id: sourceId, title, url: canonicalUrl.toString(),
    characters_indexed: text.length, chunks_indexed: chunks.length,
    note: "Nur Entwurf. Manuelle Prüfung ist erforderlich, bevor die Fundstelle in Antworten verwendet wird." });
});

function isRobotsBlocked(content: string, path: string): boolean {
  let applies = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const match = line.match(/^(user-agent|disallow)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === "user-agent") applies = value === "*" || value.toLowerCase().includes("tankstellenertrag");
    else if (key === "disallow" && applies && value && (path === value || path.startsWith(value))) return true;
  }
  return false;
}
function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<(script|style|noscript|svg|nav|footer|header|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|article|section|tr)>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[\t\u00a0 ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}
function decodeEntities(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
}
function splitChunks(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = []; let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + size);
    if (end < text.length) { const boundary = text.lastIndexOf(" ", end); if (boundary > start + size * 0.65) end = boundary; }
    const chunk = text.slice(start, end).trim(); if (chunk.length > 80) chunks.push(chunk);
    if (end >= text.length) break; start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: cors }); }

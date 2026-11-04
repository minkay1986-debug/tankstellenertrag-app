import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "server_not_configured" }, 500);

  // Require a real user session; do not expose the service key to the browser.
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);

  let body: { query?: unknown; limit?: unknown };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 500) return json({ error: "query_length_must_be_2_to_500" }, 400);
  const limit = Number.isInteger(body.limit) ? Math.max(1, Math.min(5, Number(body.limit))) : 5;

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient.rpc("search_tankstellen_knowledge", {
    search_query: query,
    result_limit: limit,
  });
  if (error) {
    console.error("knowledge search failed", error.message);
    return json({ error: "knowledge_search_failed" }, 500);
  }

  // Retrieval only: no generated or uncited claims. Results must have been approved.
  return json({
    mode: "source_retrieval_only",
    answer: data?.length
      ? "Ich habe passende freigegebene Fachquellen gefunden. Die folgenden Fundstellen sind die Grundlage; eine automatische fachliche Schlussfolgerung wird noch nicht erzeugt."
      : "Ich habe in den derzeit freigegebenen Fachquellen keine belastbare Fundstelle gefunden. Bitte formuliere die Frage anders oder prüfe weitere Quellen.",
    results: data || [],
  }, 200);
});

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: cors });
}

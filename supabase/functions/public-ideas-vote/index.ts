import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.tankstellenertrag.de",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const allowed = new Set(["stockout", "packaging", "weather", "staff"]);
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!supabaseUrl || !serviceKey || !turnstileSecret) {
    return json(503, { error: "voting_not_configured" });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const action = body.action;
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  if (action === "counts") {
    const { data, error } = await db.from("public_idea_votes").select("idea_id");
    if (error) return json(500, { error: "counts_unavailable" });
    const counts: Record<string, number> = { stockout: 0, packaging: 0, weather: 0, staff: 0 };
    for (const row of data ?? []) if (allowed.has(row.idea_id)) counts[row.idea_id]++;
    return json(200, { counts });
  }

  if (action !== "vote" || typeof body.ideaId !== "string" || !allowed.has(body.ideaId)) {
    return json(400, { error: "invalid_request" });
  }
  if (typeof body.token !== "string" || !body.token || typeof body.browserKey !== "string" || body.browserKey.length < 20 || body.browserKey.length > 200) {
    return json(400, { error: "verification_required" });
  }

  const form = new FormData();
  form.append("secret", turnstileSecret);
  form.append("response", body.token);
  const remoteIp = req.headers.get("CF-Connecting-IP");
  if (remoteIp) form.append("remoteip", remoteIp);
  let verification: { success?: boolean; hostname?: string };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    verification = await response.json();
  } catch { return json(502, { error: "verification_unavailable" }); }
  if (!verification.success || verification.hostname !== "app.tankstellenertrag.de") {
    return json(403, { error: "verification_failed" });
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.browserKey));
  const voterHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  const { error } = await db.from("public_idea_votes").insert({ idea_id: body.ideaId, voter_hash: voterHash });
  if (error?.code === "23505") return json(409, { error: "already_voted" });
  if (error) return json(500, { error: "vote_not_saved" });

  return json(200, { ok: true });
});
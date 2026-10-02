import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST erforderlich" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const token = authHeader.slice(7);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user || (userData.user.email || "").toLowerCase() !== "svenkrick@gmx.de") {
    return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const now = new Date().toISOString();
  const { data: stations, error } = await admin
    .from("stations")
    .select("id,owner_id,station_name,data_delete_at")
    .not("data_delete_at", "is", null)
    .lte("data_delete_at", now);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

  let deleted = 0;
  const errors: string[] = [];

  for (const station of stations || []) {
    if (!station.owner_id) continue;

    const uid = station.owner_id;

    // App-Daten vor dem Auth-Konto entfernen. Rechnungs-/Buchhaltungsdaten
    // werden absichtlich nicht pauschal gelöscht; sie sind separat zu behandeln.
    const snapshotDelete = await admin.from("station_snapshots").delete().eq("station_id", station.id);
    if (snapshotDelete.error) { errors.push(station.station_name + ": station_snapshots: " + snapshotDelete.error.message); continue; }

    // Erst die fachlichen Datensätze löschen, die Station selbst bleibt bis zum
    // erfolgreichen Auth-Löschschritt als Wiederholungsmarker erhalten.
    const pilotDelete = await admin.from("pilot_applications").delete().eq("user_id", uid);
    if (pilotDelete.error) { errors.push(station.station_name + ": pilot_applications: " + pilotDelete.error.message); continue; }

    const authDelete = await admin.auth.admin.deleteUser(uid);
    if (authDelete.error) {
      // Wenn der Auth-User bereits bei einem vorherigen Lauf gelöscht wurde,
      // darf der Retry trotzdem mit der Stationsbereinigung fortfahren.
      const status = Number((authDelete as any).status || 0);
      const code = String((authDelete as any).code || "");
      const alreadyGone = status === 404 || code === "user_not_found";
      if (!alreadyGone) {
        errors.push(station.station_name + ": auth.users: " + authDelete.error.message);
        continue;
      }
    }

    const stationDelete = await admin.from("stations").delete().eq("id", station.id);
    if (stationDelete.error) {
      errors.push(station.station_name + ": stations: " + stationDelete.error.message);
      continue;
    }

    deleted++;
  }

  return new Response(JSON.stringify({ ok: errors.length === 0, deleted, errors }), {
    status: errors.length ? 207 : 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

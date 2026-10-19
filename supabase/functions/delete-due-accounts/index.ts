import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST erforderlich" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("delete-due-accounts: server configuration missing");
    return json({ error: "Supabase-Serverkonfiguration fehlt" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const incomingCronSecret = req.headers.get("x-cron-secret") || "";
  const isCronCall = cronSecret.length > 0 && incomingCronSecret.length > 0 &&
    incomingCronSecret === cronSecret;

  if (!isCronCall && !authHeader.startsWith("Bearer ")) {
    return json({ error: "Nicht autorisiert" }, 401);
  }

  if (!isCronCall) {
    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const adminEmail = (userData?.user?.email || "").toLowerCase();
    if (userError || !userData?.user || adminEmail !== "svenkrick@gmx.de") {
      return json({ error: "Nicht autorisiert" }, 403);
    }
  }

  const now = new Date().toISOString();
  const { data: dueStations, error: stationError } = await admin
    .from("stations")
    .select("id, owner_id, station_name, data_delete_at")
    .not("data_delete_at", "is", null)
    .lte("data_delete_at", now);

  if (stationError) {
    console.error("delete-due-accounts: due-station lookup failed", stationError.message);
    return json({ error: "Fällige Konten konnten nicht geprüft werden." }, 500);
  }

  if (!dueStations?.length) {
    return json({ ok: true, deleted: 0, checked: 0, errors: [], message: "Keine fälligen Löschungen vorhanden." });
  }

  const owners = new Map<string, { stationIds: string[]; stationNames: string[] }>();
  for (const station of dueStations) {
    if (!station.owner_id) {
      console.error("delete-due-accounts: due station has no owner", station.id);
      continue;
    }
    const owner = owners.get(station.owner_id) ?? { stationIds: [], stationNames: [] };
    owner.stationIds.push(station.id);
    owner.stationNames.push(station.station_name || "Station");
    owners.set(station.owner_id, owner);
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const [userId, customer] of owners) {
    const label = customer.stationNames.join(", ");

    // The database RPC deletes all known customer-linked application data in one
    // transaction. Station rows remain temporarily as retry markers until Auth deletion succeeds.
    const { data: cleanup, error: cleanupError } = await admin.rpc(
      "delete_customer_data_before_auth",
      { p_owner_id: userId, p_station_ids: customer.stationIds },
    );
    if (cleanupError || !cleanup?.ok) {
      const detail = cleanupError?.message || cleanup?.error || "Datenbereinigung fehlgeschlagen";
      console.error("delete-due-accounts: customer data cleanup failed", { userId, detail });
      errors.push(`${label}: Datenbereinigung: ${detail}`);
      continue;
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      const status = Number((authDeleteError as { status?: number }).status || 0);
      const code = String((authDeleteError as { code?: string }).code || "");
      const alreadyGone = status === 404 || code === "user_not_found";
      if (!alreadyGone) {
        console.error("delete-due-accounts: Auth deletion failed", { userId, message: authDeleteError.message });
        errors.push(`${label}: Auth-Konto: ${authDeleteError.message}`);
        continue;
      }
    }

    // Delete every station for this owner only after Auth is deleted (or already absent).
    const { error: stationDeleteError } = await admin
      .from("stations")
      .delete()
      .in("id", customer.stationIds)
      .eq("owner_id", userId);

    if (stationDeleteError) {
      console.error("delete-due-accounts: final station cleanup failed", { userId, message: stationDeleteError.message });
      errors.push(`${label}: abschließende Stationsbereinigung: ${stationDeleteError.message}`);
      continue;
    }

    deleted++;
  }

  return json({
    ok: errors.length === 0,
    deleted,
    checked: owners.size,
    errors,
  }, errors.length ? 207 : 200);
});

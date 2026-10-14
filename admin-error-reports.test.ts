import { assert, assertStringIncludes, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile("supabase/migrations/20261014190000_admin_app_error_reports.sql");
const portal = await Deno.readTextFile("index.html");

Deno.test("Fehlerbericht: Tabelle ist mit RLS abgesichert", () => {
  assertMatch(migration, /create table if not exists public\.app_error_reports/i);
  assertMatch(migration, /alter table public\.app_error_reports enable row level security/i);
  assertMatch(migration, /revoke all on public\.app_error_reports from anon, authenticated/i);
  assertMatch(migration, /grant select, insert, update on public\.app_error_reports to service_role/i);
});

Deno.test("Fehlerbericht: Schreiben erfordert angemeldeten Benutzer", () => {
  assertMatch(migration, /caller_id uuid := auth\.uid\(\)/i);
  assertMatch(migration, /if caller_id is null then raise exception 'Authentifizierung erforderlich\.'/i);
  assertMatch(migration, /grant execute on function public\.report_app_error\(text,text,text,integer,jsonb\) to authenticated/i);
  assertMatch(migration, /revoke execute on function public\.report_app_error\(text,text,text,integer,jsonb\) from public, anon/i);
});

Deno.test("Fehlerbericht: Metadaten werden auf erlaubte Felder reduziert", () => {
  assertMatch(migration, /safe_meta := safe_meta - 'token' - 'access_token' - 'refresh_token' - 'password' - 'authorization' - 'body' - 'url'/i);
  assertMatch(migration, /jsonb_build_object\(\s*'path'.*'online'.*'appVersion'/is);
  assertMatch(migration, /left\(regexp_replace\(coalesce\(p_message/i);
});

Deno.test("Fehlerbericht: Wiederholungen werden gebündelt und begrenzt", () => {
  assertMatch(migration, /last_seen > now\(\)-interval '15 minutes'/i);
  assertMatch(migration, /occurrences=least\(occurrences\+1,100000\)/i);
  assertMatch(migration, /case status when 'open' then 0 when 'monitoring' then 1 else 2 end/i);
  assertMatch(migration, /limit greatest\(1,least\(coalesce\(p_limit,100\),300\)\)/i);
});

Deno.test("Fehlerbericht: Admin-Lesezugriff und Statusänderung sind geschützt", () => {
  const adminChecks = migration.match(/lower\(coalesce\(auth\.jwt\(\)->>'email',''\)\) <> 'svenkrick@gmx\.de'/gi) ?? [];
  if (adminChecks.length < 2) throw new Error(`Erwartet wurden zwei getrennte Admin-Prüfungen, gefunden: ${adminChecks.length}`);
  assertMatch(migration, /p_status not in \('open','monitoring','resolved'\)/i);
  assertMatch(migration, /grant execute on function public\.get_admin_app_error_reports\(integer\) to authenticated/i);
  assertMatch(migration, /grant execute on function public\.set_admin_app_error_status\(bigint,text\) to authenticated/i);
});

Deno.test("Browser-Erfassung: HTTP- und Netzwerkfehler werden erkannt", () => {
  assertStringIncludes(portal, "window.__TSE_errorCaptureInstalled=true");
  assertMatch(portal, /catch\(fetchError\)[\s\S]*tseReport\(source,'FetchError'/);
  assertMatch(portal, /response\.status>=400/);
  assertMatch(portal, /addEventListener\('error'/);
  assertMatch(portal, /addEventListener\('unhandledrejection'/);
});

Deno.test("Browser-Erfassung: Report-RPCs werden von der Fetch-Erfassung ausgenommen", () => {
  assertMatch(portal, /report_app_error\|get_admin_app_error_reports\|set_admin_app_error_status/);
  assertMatch(portal, /if\(!client\|\|!navigator\.onLine\)return/);
  assertMatch(portal, /now-\(tseReported\.get\(key\)\|\|0\)<60000/);
});

Deno.test("Admin-Oberfläche: Fehlerliste wird nur über Admin-RPC geladen", () => {
  assertStringIncludes(portal, "loadAdminAppErrorReports()");
  assertStringIncludes(portal, "get_admin_app_error_reports");
  assertStringIncludes(portal, "set_admin_app_error_status");
  assertStringIncludes(portal, "app_error_reports");
});

Deno.test("Fehlererfassung enthält keine Zugangsdaten oder Request-Bodies im RPC-Aufruf", () => {
  assertMatch(portal, /p_metadata:\{path:location\.pathname,online:navigator\.onLine,appVersion:/);
  assertMatch(portal, /p_message:text,p_http_status:httpStatus/);
  assertMatch(portal, /\/rest\/v1\/rpc\/\(report_app_error\|get_admin_app_error_reports\|set_admin_app_error_status\)/);
});

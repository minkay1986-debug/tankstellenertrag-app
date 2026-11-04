import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../../analyse.html", import.meta.url), "utf8");
const anchor = html.indexOf("function advisorAiFacts()");
assert.notEqual(anchor, -1, "AI advisor integration must be present");
const scriptStart = html.lastIndexOf("<script", anchor);
const openEnd = html.indexOf(">", scriptStart);
const scriptEnd = html.indexOf("</script>", openEnd);
assert.ok(scriptStart >= 0 && openEnd >= 0 && scriptEnd > openEnd, "AI integration must live in a valid inline script block");
const script = html.slice(openEnd + 1, scriptEnd);

test("AI advisor app integration JavaScript parses", () => {
  assert.doesNotThrow(() => new vm.Script(script));
});

test("AI requests use the existing authenticated Supabase session", () => {
  assert.match(script, /__tseAdvisorGetAccessToken=async\(\)=>\{const session=await getStableSession\(\)/);
  assert.match(script, /Bearer '\+token/);
  assert.doesNotMatch(script, /userId\s*:/);
});

test("AI advisor keeps deterministic answer as fallback, presents it compactly and appends model output as text", () => {
  assert.match(script, /const fallback=advisorReply\(q\)/);
  assert.match(script, /function advisorCompactHtml\(raw,fullHtml\)/);
  assert.match(script, /body\.innerHTML=advisorCompactHtml\(q,fallback/);
  assert.match(script, /REGELBASIERTE AUSWERTUNG/);
  assert.match(script, /Alle Zahlen, Vergleiche und fachlichen Details anzeigen/);
  assert.match(script, /Umsatzabgleich prüfen/);
  assert.match(script, /content\.textContent=aiAnswer/);
  assert.match(script, /KI-Fachberatung momentan nicht erreichbar/);
});

test("only application-calculated KPI facts are sent, with missing sources marked", () => {
  assert.match(script, /function advisorAiFacts\(\)/);
  assert.match(script, /d\.sourceEK\?money\(d\.gross\):'nicht berechenbar, EK fehlt'/);
  assert.match(script, /d\.sourceWriteoff\?money\(d\.writeoff\):'nicht vollständig erfasst'/);
  assert.match(script, /JSON\.stringify\(\{question,facts:advisorAiFacts\(\)\}\)/);
});

test("AI integration remains opt-in until a test endpoint is configured", () => {
  assert.match(script, /window\.TANKSTELLENERTRAG_AI_ADVISOR_URL\|\|''/);
  assert.match(script, /if\(!endpoint\)return null/);
});

test("local AI pilot uses isolated Supabase project and never changes live-domain config", () => {
  const config = fs.readFileSync(new URL("../../supabase-config.js", import.meta.url), "utf8");
  assert.match(config, /location\.hostname === 'localhost' && location\.port === '4173'/);
  assert.match(config, /rzydxhnphwuocttdncsm\.supabase\.co/);
  assert.match(config, /tankstellenertrag-advisor-ai-test\.minkay1986\.workers\.dev/);
  assert.match(config, /irzlbdybtrbztjjkrlad\.supabase\.co/);
  assert.match(config, /tseAdvisorLocalTest \?/);
});

test("worker endpoints are isolated by exact hostname", () => {
  const config = fs.readFileSync(new URL("../../supabase-config.js", import.meta.url), "utf8");
  const resolve = (hostname, port = "") => {
    const window = {};
    vm.runInNewContext(config, {
      window,
      location: { hostname, port },
      document: { addEventListener() {} }
    });
    return {
      supabase: window.TANKSTELLENERTRAG_SUPABASE?.url,
      advisor: window.TANKSTELLENERTRAG_AI_ADVISOR_URL || null
    };
  };
  const preview = resolve("feature-ai-advisor-chat-pilo.tankstellenertrag-preview.pages.dev");
  assert.equal(preview.supabase, "https://rzydxhnphwuocttdncsm.supabase.co");
  assert.equal(preview.advisor, "https://tankstellenertrag-advisor-ai-test.minkay1986.workers.dev");
  const local = resolve("localhost", "4173");
  assert.equal(local.advisor, "https://tankstellenertrag-advisor-ai-test.minkay1986.workers.dev");
  const live = resolve("app.tankstellenertrag.de");
  assert.equal(live.supabase, "https://irzlbdybtrbztjjkrlad.supabase.co");
  assert.equal(live.advisor, "https://tankstellenertrag-advisor-ai-live.minkay1986.workers.dev");
  assert.equal(resolve("app.tankstellenertrag.de.evil.example").advisor, null);
  assert.equal(resolve("some-other-preview.pages.dev").advisor, null);
});


test("AI prompt requests concise answers and cautious handling of group-sales differences", () => {
  const worker = fs.readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(worker, /maximal etwa 120 Wörter/);
  assert.match(worker, /höchstens 3 Stichpunkte/);
  assert.match(worker, /Abdeckungs-\/Plausibilitätsprüfung/);
});

test("loss advice reports prior-year data independently and never treats missing loss sources as zero", () => {
  assert.match(script, /const lossSnapshot=period=>/);
  assert.match(script, /const yearLoss=lossSnapshot\(y\)/);
  assert.ok(script.includes("lossPeriodText('Vorjahresmonat ("));
  assert.match(script, /snapshot\.total!==null&&currentLoss\.total!==null/);
  assert.match(script, /lossTotal=shrinkAvailable&&writeoffAvailable/);
  assert.match(script, /shrinkAvailable\?money\(shrink\):'Nicht erfasst'/);
  assert.match(script, /writeoffAvailable\?money\(writeoff\):'Nicht erfasst'/);
});

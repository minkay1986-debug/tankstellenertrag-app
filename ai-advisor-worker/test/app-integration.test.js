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
  assert.match(script, /authorization:'Bearer '\+token/);
  assert.doesNotMatch(script, /userId\s*:/);
});

test("AI advisor keeps deterministic answer as fallback and appends model output as text", () => {
  assert.match(script, /const fallback=advisorReply\(q\)/);
  assert.match(script, /body\.innerHTML=fallback/);
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

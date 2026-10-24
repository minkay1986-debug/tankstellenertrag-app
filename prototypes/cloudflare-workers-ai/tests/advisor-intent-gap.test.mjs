import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appPath = new URL("../../../analyse.html", import.meta.url);
async function flagsFor(question) {
  const source = await readFile(appPath, "utf8");
  const normStart = source.indexOf("function advisorNorm(");
  const normEnd = source.indexOf("function advisorReply(", normStart);
  assert.ok(normStart >= 0 && normEnd > normStart);
  const normFn = source.slice(normStart, normEnd);
  const start = source.indexOf("const intentText=String(q||'')");
  const end = source.indexOf("const help=", start);
  assert.ok(start >= 0 && end > start);
  const layer = source.slice(start, end);
  const script = `(()=>{ ${normFn}; return function(raw){ const q=String(advisorNorm(raw)||''); ${layer}; return {isTheft,isDataQuality,isLoss,isMargin}; }; })()`;
  return vm.runInNewContext(script)(question);
}

test("data-quality phrasing is routed to the data-quality intent", async () => {
  assert.equal((await flagsFor("Der Einkauf ist null. Ist das richtig?")).isDataQuality, true);
  assert.equal((await flagsFor("Welche Daten fehlen noch?")).isDataQuality, true);
});

test("personal-only phrasing does not imply theft", async () => {
  assert.equal((await flagsFor("Das Personal ist freundlich.")).isTheft, false);
  assert.equal((await flagsFor("Kann das Diebstahl sein?")).isTheft, true);
});

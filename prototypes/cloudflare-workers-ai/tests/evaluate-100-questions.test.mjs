import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appPath = new URL("../../../analyse.html", import.meta.url);
const corpusPath = new URL("../QUESTION-CORPUS.md", import.meta.url);

async function loadCorpus() {
  const md = await readFile(corpusPath, "utf8");
  const block = md.match(/```jsonl\n([\s\S]*?)\n```/);
  assert.ok(block, "Question corpus must contain JSONL");
  return block[1].split("\n").filter(Boolean).map(line => JSON.parse(line));
}
function extractFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.notEqual(end, -1, `Missing boundary ${nextName}`);
  return source.slice(start, end);
}
function actualIntentFlags(source, raw) {
  const normFn = extractFunction(source, "advisorNorm", "advisorDirectAnswer");
  const start = source.indexOf("const intentText=String(q||'')");
  const endStart = source.indexOf("isMargin=", start);
  assert.notEqual(start, -1, "Missing actual advisor intent layer");
  assert.notEqual(endStart, -1, "Missing margin intent flag");
  const marginEnd = source.indexOf(";", endStart);
  assert.notEqual(marginEnd, -1, "Missing intent layer terminator");
  const layer = source.slice(start, marginEnd + 1);
  const expandFn = extractFunction(source, "advisorExpandQuery", "advisorKnowledgeHtml");
  const wrapped = `(function(raw){ const q=String(advisorExpandQuery(raw)||''); ${layer}; return {q,semanticLoss,isHelp,isWeather,isTheft,isLoss,isEuroCompare,isMargin,isYear,isSales,isDataQuality,isOrder,isAssortment,isPrice}; })`;
  return vm.runInNewContext(`(()=>{ ${normFn}; ${expandFn}; return ${wrapped.slice(1, -1)}; })()`)(raw);
}

const EXPECTED_FLAGS = {
  loss_analysis: ["isLoss", "semanticLoss"],
  margin_analysis: ["isMargin", "isEuroCompare"],
  sales_analysis: ["isSales", "isYear"],
  data_quality: ["isDataQuality"],
  ordering_stock: ["isOrder", "isAssortment"],
  weather: ["isWeather"],
  theft_security: ["isTheft"],
  help_navigation: ["isHelp"],
  ambiguous_clarification: [],
  robustness: [],
};

test("evaluate actual local advisor intent routing against all 100 synthetic questions", async (t) => {
  const [source, corpus] = await Promise.all([
    readFile(appPath, "utf8"),
    loadCorpus()
  ]);
  assert.equal(corpus.length, 100, "The benchmark must contain exactly 100 questions");

  const results = corpus.map(item => {
    const flags = actualIntentFlags(source, item.question);
    const expected = EXPECTED_FLAGS[item.intent];
    assert.ok(expected, `No routing expectation registered for ${item.intent}`);
    const recognized = expected.length === 0
      ? null
      : expected.some(flag => flags[flag] === true);
    return {
      id: item.id,
      intent: item.intent,
      question: item.question,
      recognized,
      flags: Object.keys(flags).filter(key => key !== "q" && flags[key] === true),
      expectedBehavior: item.expected_behavior,
      requiredContext: item.required_context,
      criticalFailures: item.critical_failures,
    };
  });

  const scored = results.filter(r => r.recognized !== null);
  const passed = scored.filter(r => r.recognized).length;
  const failed = scored.filter(r => !r.recognized);
  const unscored = results.filter(r => r.recognized === null);
  const summary = {
    benchmark: "synthetic 100-question corpus",
    testedLayer: "actual advisor intent routing extracted from analyse.html",
    questions: results.length,
    routingScored: scored.length,
    routingRecognized: passed,
    routingMissed: failed.length,
    notAutoScoredByDesign: unscored.length,
    routingRatePercent: Number((passed / Math.max(1, scored.length) * 100).toFixed(1)),
    misses: failed.map(({id, intent, question, flags}) => ({id, intent, question, flags})),
    manualAnswerQualityStillRequired: true,
    note: "This measures intent routing only. It does not score actual answer text, factual correctness, data integrity, usefulness, or safety. Ambiguous and robustness cases require scenario-specific review."
  };
  console.log("\n100-QUESTION ADVISOR ROUTING REPORT\n" + JSON.stringify(summary, null, 2));
  t.diagnostic(`Actual routing recognized ${passed}/${scored.length}; ${failed.length} misses; ${unscored.length} cases reserved for scenario-specific review.`);
  assert.equal(results.length, 100);
  assert.ok(scored.length >= 70, "Expected enough questions to have a defined intent-routing expectation");
});

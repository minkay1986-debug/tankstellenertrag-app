import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appPath = new URL("../../../analyse.html", import.meta.url);
const corpusPath = new URL("../QUESTION-CORPUS.md", import.meta.url);

async function loadApp() { return readFile(appPath, "utf8"); }
async function loadCorpus() {
  const md = await readFile(corpusPath, "utf8");
  const block = md.match(/```jsonl\n([\s\S]*?)\n```/);
  assert.ok(block, "QUESTION-CORPUS.md must contain a JSONL block");
  return block[1].split("\n").filter(Boolean).map(line => JSON.parse(line));
}
function extractFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Could not find actual ${name} function in analyse.html`);
  const end = nextName ? source.indexOf(`function ${nextName}(`, start + 1) : -1;
  assert.notEqual(end, -1, `Could not find boundary function ${nextName}`);
  return source.slice(start, end);
}
function actualIntentFlags(source, raw) {
  const normFn = extractFunction(source, "advisorNorm", "advisorReply");
  const normalized = vm.runInNewContext(`(()=>{ ${normFn}; return advisorNorm; })()`)(raw);
  const start = source.indexOf("const intentText=String(q||'')");
  const endToken = "const isMargin=";
  const endStart = source.indexOf(endToken, start);
  assert.notEqual(start, -1, "Could not find actual advisor intent layer");
  assert.notEqual(endStart, -1, "Could not find actual margin intent flag");
  const marginStart = endStart + endToken.length;
  const marginEnd = source.indexOf(";", marginStart);
  assert.notEqual(marginEnd, -1, "Could not find end of actual margin intent flag");
  const intentLayer = source.slice(start, marginEnd + 1);
  const wrapped = `(function(raw){ const q=String(advisorNorm(raw)||''); ${intentLayer}; return {q,semanticLoss,isHelp,isWeather,isTheft,isLoss,isEuroCompare,isMargin}; })`;
  return vm.runInNewContext(`(()=>{ ${normFn}; return ${wrapped.slice(1, -1)}; })()`)(raw);
}

test("the synthetic question corpus contains 100 unique questions", async () => {
  const corpus = await loadCorpus();
  assert.equal(corpus.length, 100);
  assert.equal(new Set(corpus.map(x => x.id)).size, 100);
  assert.ok(corpus.every(x => x.question && x.intent && x.must_not));
});

test("actual advisor normalization handles case, accents, ß and punctuation", async () => {
  const source = await loadApp();
  const normFn = extractFunction(source, "advisorNorm", "advisorReply");
  const norm = vm.runInNewContext(`(()=>{ ${normFn}; return advisorNorm; })()`);
  assert.equal(norm("  MARGE?? ÖL-Änderung!  "), "marge ol-anderung");
  assert.equal(norm("GROẞE Abschriften!!!"), "grosse abschriften");
  assert.equal(norm("  Was bleibt mir übrig?  "), "was bleibt mir ubrig");
});

test("actual advisor intent layer recognizes core intents and common wording variants", async () => {
  const source = await loadApp();
  const cases = [
    ["Wo verliere ich Geld?", "isLoss"],
    ["Kannst du meinen Schwund prüfen?", "isLoss"],
    ["Wie hoch ist meine Marge?", "isMargin"],
    ["Wie wirkt sich Regen aus?", "isWeather"],
    ["Kann das Diebstahl sein?", "isTheft"],
    ["Wie benutze ich den Beratungsbericht?", "isHelp"],
    ["Wie hoch ist mein Verlust diesen Monat?", "semanticLoss"]
  ];
  for (const [question, flag] of cases) {
    const flags = actualIntentFlags(source, question);
    assert.equal(flags[flag], true, `Expected ${flag} for: ${question}`);
  }
});

test("zero, missing data and causality guardrails are explicitly represented in corpus", async () => {
  const corpus = await loadCorpus();
  const questions = corpus.map(x => x.question.toLowerCase()).join("\n");
  const guardrails = corpus.map(x => x.must_not.toLowerCase()).join("\n");
  assert.match(questions, /einkauf ist null/);
  assert.match(questions, /keine daten für den einkauf/);
  assert.match(guardrails, /ursache/);
  assert.match(guardrails, /fehlenden ek/);
});

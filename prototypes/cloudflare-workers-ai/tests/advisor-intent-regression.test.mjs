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
  const normFn = extractFunction(source, "advisorNorm", "advisorDirectAnswer");
  const normalized = vm.runInNewContext(`(()=>{ ${normFn}; return advisorNorm; })()`)(raw);
  const start = source.indexOf("const intentText=String(q||'')");
  const endToken = "isMargin=";
  const endStart = source.indexOf(endToken, start);
  assert.notEqual(start, -1, "Could not find actual advisor intent layer");
  assert.notEqual(endStart, -1, "Could not find actual margin intent flag");
  const marginStart = endStart + endToken.length;
  const marginEnd = source.indexOf(";", marginStart);
  assert.notEqual(marginEnd, -1, "Could not find end of actual margin intent flag");
  const intentLayer = source.slice(start, marginEnd + 1);
  const wrapped = `(function(raw){ const q=String(advisorNorm(raw)||''); ${intentLayer}; return {q,semanticLoss,isHelp,isWeather,isTheft,isLoss,isEuroCompare,isMargin,isYear,isSales,isDataQuality}; })`;
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
  const normFn = extractFunction(source, "advisorNorm", "advisorDirectAnswer");
  const norm = vm.runInNewContext(`(()=>{ ${normFn}; return advisorNorm; })()`);
  assert.equal(norm("  MARGE?? ÖL-Änderung!  "), "marge ol-anderung");
  assert.equal(norm("GROẞE Abschriften!!!"), "grosse abschriften");
  assert.equal(norm("  Was bleibt mir übrig?  "), "was bleibt mir ubrig");
});

test("actual query expansion recognizes normalized German everyday wording", async () => {
  const source = await loadApp();
  const normFn = extractFunction(source, "advisorNorm", "advisorDirectAnswer");
  const expandFn = extractFunction(source, "advisorExpandQuery", "advisorKnowledgeHtml");
  const expand = vm.runInNewContext(`(()=>{ ${normFn}; ${expandFn}; return advisorExpandQuery; })()`);
  const cases = [
    ["Warum bleibt weniger übrig?", ["marge", "rohertrag", "wareneinsatz"]],
    ["Ich verdiene trotz mehr Umsatz nicht mehr", ["marge", "rohertrag", "gewinn"]],
    ["Meine Marge ist schlechter geworden", ["marge", "rohertrag"]],
    ["Was mache ich mit abgelaufenen Backwaren?", ["abschriften", "verderb", "backwaren"]],
    ["Ich habe ständig Regallücken", ["regallucke", "regalverfuegbarkeit", "absatzverlust"]],
    ["Was soll ich nächste Woche bestellen?", ["bestellmenge", "disposition"]],
    ["Lohnt es sich, die Getränkepreise zu senken?", ["preisstrategie", "preiselastizitaet"]],
    ["Welche Artikel sollte ich auslisten?", ["sortimentsoptimierung", "artikelrentabilitaet"]]
  ];
  for (const [question, expectedTerms] of cases) {
    const expanded = expand(question);
    for (const term of expectedTerms) {
      assert.ok(expanded.includes(term), `Expected "${term}" in expansion for: ${question}; got: ${expanded}`);
    }
  }
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
  assert.match(questions, /ek steht 0|einkauf ist null/);
  assert.match(questions, /fehlt der ek-wert|keine daten für den einkauf/);
  assert.match(guardrails, /ursache/);
  assert.match(guardrails, /fehlenden ek/);
});

test("legal, tax and personnel questions receive only the fixed scope notice first", async () => {
  const source = await loadApp();
  const normFn = extractFunction(source, "advisorNorm", "advisorDirectAnswer");
  const directFn = extractFunction(source, "advisorDirectAnswer", "advisorHasCurrentMonthData");
  const direct = vm.runInNewContext(`(()=>{ ${normFn}; ${directFn}; return advisorDirectAnswer; })()`);
  const notice = "Dieser Fachbereich ist noch nicht Teil unserer Beratung.";
  for (const question of [
    "Darf ich meinem Mitarbeiter kündigen?",
    "Darf ich meinen Mitarbeiter kündigen?",
    "Wie versteuere ich das?",
    "Was muss ich arbeitsrechtlich beachten?",
    "Muss ich Umsatzsteuer auf den Verkauf zahlen?",
    "Ist das gesetzlich erlaubt?",
    "Kann man anhand dieser Kennzahlen feststellen, welcher Mitarbeiter Ware entwendet?"
  ]) {
    const answer = direct(question);
    assert.ok(answer.includes(notice), `Expected scope notice for: ${question}`);
    assert.equal((answer.match(/<p>/g) || []).length, 1, `Expected only one short notice paragraph for: ${question}`);
  }
});

test("ordinary inventory and shrinkage questions are not blocked by the scope notice", async () => {
  const source = await loadApp();
  const normFn = extractFunction(source, "advisorNorm", "advisorDirectAnswer");
  const directFn = extractFunction(source, "advisorDirectAnswer", "advisorHasCurrentMonthData");
  const direct = vm.runInNewContext(`(()=>{ ${normFn}; ${directFn}; return advisorDirectAnswer; })()`);
  for (const question of [
    "Wie prüfe ich Inventurdifferenzen?",
    "Wie reduziere ich Schwund?",
    "Wie erkläre ich meinem Mitarbeiter die Schwundkontrolle?"
  ]) {
    assert.ok(!direct(question).includes("Dieser Fachbereich ist noch nicht Teil unserer Beratung."), `Inventory question incorrectly blocked: ${question}`);
  }
});

test("actual advisor recognizes data-quality wording without broad false positives", async () => {
  const source = await loadApp();
  const cases = [
    ["Der Einkauf ist null. Ist das richtig?", true],
    ["Welche Daten fehlen noch?", true],
    ["Welche Werte fehlen noch?", true],
    ["Sind die Werte für beide Jahre vollständig?", true],
    ["Der Einkaufspreis fehlt im Import.", true],
    ["Sind die Daten für den Vorjahresvergleich vergleichbar?", true],
    ["Warum bleibt von meinem Umsatz so wenig übrig?", false],
    ["Wie reduziere ich Schwund?", false],
  ];
  for (const [question, expected] of cases) {
    const flags = actualIntentFlags(source, question);
    assert.equal(flags.isDataQuality, expected, `Unexpected data-quality intent for: ${question}`);
  }
});

test("personnel wording alone does not activate theft intent", async () => {
  const source = await loadApp();
  for (const question of [
    "Wie plane ich den Personaleinsatz?",
    "Wie erkläre ich meinem Mitarbeiter die Schwundkontrolle?",
    "Wie organisiere ich die Schichtübergabe?",
  ]) {
    const flags = actualIntentFlags(source, question);
    assert.equal(flags.isTheft, false, `Personnel-only wording must not imply theft: ${question}`);
  }
});

test("multi-intent wording preserves both metrics and the prior-year comparison", async () => {
  const source = await loadApp();
  const flags = actualIntentFlags(source, "Vergleiche Umsatz UND Marge zum Vorjahr.");
  assert.equal(flags.isSales, true, "Umsatz intent must be detected");
  assert.equal(flags.isMargin, true, "Margin intent must be detected");
  assert.equal(flags.isYear, true, "Prior-year intent must be detected");
});

test("advisor explicitly distinguishes unentered month data from recorded zero", async () => {
  const source = await loadApp();
  assert.ok(source.includes("function advisorHasCurrentMonthData("));
  assert.ok(source.includes("function advisorNoDataAnswer("));
  assert.ok(source.includes("if(noData&&!advisorHasCurrentMonthData())return noData"));
  assert.ok(source.includes("r._revenueEntered=$('rev').value!==''"));
  assert.ok(source.includes("r._ekEntered=$('ek').value!==''"));
  assert.ok(source.includes("x.sourceMonthly===true||x.sourceEK===true"));
  assert.match(source, /nicht als Nachweis für tatsächlich null Umsatz/);
});

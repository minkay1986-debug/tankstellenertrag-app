/**
 * Contract tests for the production HUTH parser embedded in analyse.html.
 * Uses synthetic data only. No customer data, Supabase access or writes.
 * Run: node --test tests/huth-parser-contract.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'analyse.html'), 'utf8');

const start = source.indexOf('function parseHuth(text){');
const end = source.indexOf('\n\nlet huthParsed=null;function renderHuth', start);
assert.ok(start >= 0 && end > start, 'parseHuth function must remain discoverable in analyse.html');

const GROUPS = [
  ['süsswaren', 'Süßwaren', 50], ['backshop', 'Backshop', 59.2],
  ['kaffee', 'Kaffee', 55], ['drogerie', 'Drogerie', 50],
  ['lebensmittel', 'Lebensmittel', 50], ['spielzeug', 'Spielzeug', 45],
  ['waschen', 'Waschen', 0], ['getraenke', 'Getränke', 50], ['eis', 'Eis', 56.8]
];
const context = { GROUPS, data: { settings: {} } };
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const parseHuth = context.parseHuth;

function report({shop='Shopware v. MwSt 19,00 % 1.000,00 Stk 1.000,00 EUR', groups=[]}={}) {
  return [shop, ...groups].join('\n');
}
function wg(name, amount, code='001') {
  return `WG${code} ${name} 19,00 % 1.000,00 Stk ${amount} EUR`;
}

test('maps supported HUTH aliases to the existing group IDs', () => {
  const p = parseHuth(report({groups:[
    wg('Kaffee', '1.234,56'), wg('Backwaren', '2.000,00', '002'),
    wg('Getränke', '3.000,00', '003')
  ]}));
  assert.equal(p.groups.kaffee, 1234.56);
  assert.equal(p.groups.backshop, 2000);
  assert.equal(p.groups.getraenke, 3000);
});

test('keeps unknown merchandise groups visible for manual mapping', () => {
  const p = parseHuth(report({groups:[wg('Saisonartikel Unbekannt', '123,45')]}));
  assert.equal(p.unmappedGroups.length, 1);
  assert.equal(p.unmappedGroups[0].name, 'Saisonartikel Unbekannt');
  assert.equal(p.unmappedGroups[0].amount, 123.45);
});

test('does not invent EK, shrink or write-off values from a revenue report', () => {
  const p = parseHuth(report({groups:[wg('Kaffee', '1.234,56')]}));
  assert.equal(Object.hasOwn(p, 'ek'), false);
  assert.equal(Object.hasOwn(p, 'shrink'), false);
  assert.equal(Object.hasOwn(p, 'writeoff'), false);
  assert.equal(p.neutralShrink, 0);
});

test('reads German decimal and thousands separators accurately', () => {
  const p = parseHuth(report({groups:[wg('Kaffee', '12.345,67')]}));
  assert.equal(p.groups.kaffee, 12345.67);
});

test('returns the HUTH shop total independently from mapped group totals', () => {
  const p = parseHuth(report({groups:[wg('Kaffee', '400,00')]}));
  assert.equal(p.shop, 1000);
  assert.equal(p.groups.kaffee, 400);
});


test('parses the isolated report-import prototype script without syntax errors', () => {
  const prototype = fs.readFileSync(path.join(__dirname, '..', 'ai-report-import-prototype.html'), 'utf8');
  const match = prototype.match(/<script type="module">([\s\S]*?)<\/script>/i);
  assert.ok(match, 'prototype module script must exist');
  assert.doesNotThrow(() => new vm.Script(match[1], { filename: 'ai-report-import-prototype.html' }));
});

test('review value parser rejects empty or malformed values instead of converting them to zero', () => {
  const prototype = fs.readFileSync(path.join(__dirname, '..', 'ai-report-import-prototype.html'), 'utf8');
  assert.match(prototype, /if\(!s\|\|/);
  assert.match(prototype, /map\(el=>\[el\.dataset\.value,parseGermanNumber\(el\.value\)\]\)/);
  assert.doesNotMatch(prototype, /Number\(String\(el\.value\)\.trim\(\)\.replace/);
});


test('runs German OCR locally for images and scanned PDF pages', () => {
  const prototype = fs.readFileSync(path.join(__dirname, '..', 'ai-report-import-prototype.html'), 'utf8');
  assert.match(prototype, /tesseract\.esm\.min\.js/);
  assert.match(prototype, /createWorker\('deu'/);
  assert.match(prototype, /async function ocrImage\(file,worker\)/);
  assert.match(prototype, /if\(!text\)\s*\{[\s\S]*?recognizeCanvas\(canvas,worker\)/);
  assert.match(prototype, /await ocrImage\(file,worker\)/);
});


test('classifies EK, shrinkage and margin reports while ignoring FIFO', () => {
  const prototype = fs.readFileSync(path.join(__dirname, '..', 'ai-report-import-prototype.html'), 'utf8');
  const numberFn = prototype.slice(prototype.indexOf('function parseGermanNumber'), prototype.indexOf('const rules'));
  const parserFns = prototype.slice(prototype.indexOf('function numericTokens'), prototype.indexOf('function renderPages'));
  const context = { crypto: { randomUUID: () => 'test-id' } };
  vm.createContext(context);
  vm.runInContext(numberFn + parserFns, context);
  const parse = context.parseHuthStatistics;
  const classify = context.classifyHuthReport;

  const ek = parse([{file:'ek.pdf',page:1,text:'Statistik von August 2026\nGesamt EK-Netto (EUR)\nWarengruppe 0 71.506,62\nBackwaren 0 1.348,15'}]);
  assert.equal(ek.diagnostics[0].type, 'ek_netto');
  assert.equal(ek.candidates.find(x=>x.group==='Backwaren').value, 1348.15);

  assert.equal(classify('Statistik von August 2026\\nSchwund Netto (Gesamt)\\nAnteil Schwund (Gesamt) von Verkauf (%)'), 'shrinkage');
  const shrink = parse([{file:'schwund.pdf',page:1,text:'Statistik von August 2026\nSchwund Netto (Gesamt)\nAnteil Schwund (Gesamt) von Verkauf (%)\nWarengruppe 0 775,03 0,00 83,06 115.754,32 858,09 0,74 %\nBackwaren 0 772,91 0,00 0,00 2.699,30 772,91 28,63 %'}]);
  assert.equal(shrink.diagnostics.find(d=>d.type)?.type, 'shrinkage');
  const total = shrink.candidates.find(x=>x.group==='Warengruppe');
  assert.ok(total, JSON.stringify(shrink));
  assert.equal(total.value, 858.09);
  assert.deepEqual([total.details.verderb,total.details.mhd,total.details.bruch],[775.03,0,83.06]);
  assert.equal(shrink.diagnostics.find(x=>x.check==='Schwund-Aufteilung').ok,true);

  assert.equal(classify('HUTH Monatsbericht\\nMarge\\nAbschlag (%)\\nVK-Netto (EUR)'), 'margin_report');
  const margin = parse([{file:'marge.pdf',page:1,text:'Statistik von August 2026\nMarge Abschlag (%) VK-Netto (EUR)\nWarengruppe 0 30.509,10 115.754,32 26,36 % 84.764,84\nBackwaren 0 953,29 2.699,30 35,32 % 973,10'}]);
  assert.equal(margin.diagnostics.find(d=>d.type)?.type, 'margin_report');
  const marginTotal = margin.candidates.find(x=>x.group==='Warengruppe');
  assert.equal(marginTotal.value, 30509.10);
  assert.equal(marginTotal.details.vkNetto, 115754.32);
  assert.equal(marginTotal.details.abschlagProzent, 26.36);
  assert.equal(margin.candidates.some(x=>String(x.key).toLowerCase().includes('fifo')), false);
});

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
const context = { GROUPS };
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

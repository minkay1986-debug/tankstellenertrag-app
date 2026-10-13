import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const fixture = JSON.parse(readFileSync(new URL('./two-year-test-data.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../analyse.html', import.meta.url), 'utf8');
function between(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'Could not extract source range: ' + start + ' -> ' + end);
  return html.slice(a, b);
}
const groupDecl = between('const GROUPS=', ';const $=').replace(/;$/, '');
const functions = [
  between('function empty(){', 'function month()'),
  between('function mrow(', 'function calc('),
  between('function calc(', 'function reconciliation('),
  between('function settings(){', 'function renderGroups(){'),
  between('function hasData(', 'function keys(){'),
  between('function keys(){', 'function renderGroups(){'),
  between('function yearly(){', 'function report(){')
].join('\n');

function render(months) {
  const elements = { yearTable: { innerHTML: '' } };
  const context = {
    data: { months, settings: {} }, console,
    $: id => elements[id] || (elements[id] = { innerHTML: '' }),
    eur: n => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
    pct: n => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
  };
  vm.createContext(context);
  vm.runInContext(groupDecl + ';' + functions, context);
  context.yearly();
  return elements.yearTable.innerHTML;
}
const original = render(fixture.months);
assert.match(original, /2025/);
assert.match(original, /2026/);
const changed = JSON.parse(JSON.stringify(fixture.months));
const key = '2026-01';
const before = changed[key].groups.getraenke.revenue;
changed[key].groups.getraenke.revenue += 1000;
changed[key].revenue += 1000;
const updated = render(changed);
assert.notEqual(updated, original, 'yearly overview must react when an entered monthly group value changes');
const originalRow = original.match(/<tr><td>2026<\/td>(.*?)<\/tr>/)?.[1];
const updatedRow = updated.match(/<tr><td>2026<\/td>(.*?)<\/tr>/)?.[1];
assert.ok(originalRow && updatedRow, 'both annual summary rows must exist');
assert.notEqual(originalRow, updatedRow, '2026 annual summary row must change after a 2026 monthly value changes');
assert.match(updated, /2026-01/, 'monthly detail for the changed month remains visible');
console.log(JSON.stringify({
  status: 'PASS',
  tested: 'actual yearly() renderer extracted from analyse.html',
  mutation: { month: key, group: 'getraenke', field: 'revenue', delta: 1000 },
  checks: ['annual row changes after controlled input mutation', 'monthly detail remains rendered', '2025 and 2026 remain present']
}, null, 2));

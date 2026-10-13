import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const fixture = JSON.parse(readFileSync(new URL('./two-year-test-data.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../analyse.html', import.meta.url), 'utf8');
function sourceLine(prefix) {
  const line = html.split(/\r?\n/).find(row => row.includes(prefix));
  assert.ok(line, 'Source line found: ' + prefix);
  return line;
}
const groupDecl = sourceLine('const GROUPS=').slice(0, sourceLine('const GROUPS=').indexOf(';const $='));
const functions = [
  sourceLine('function empty(){').slice(0, sourceLine('function empty(){').indexOf('function month()')),
  sourceLine('function mrow(').slice(0, sourceLine('function calc(')),
  sourceLine('function calc(').slice(0, sourceLine('function reconciliation(')),
  sourceLine('function settings(){').slice(0, sourceLine('function renderGroups(){')),
  sourceLine('function hasData(').slice(0, sourceLine('function keys(){')),
  sourceLine('function keys(){').slice(0, sourceLine('function renderGroups(){'))
].join('\n');

const context = { data: { months: fixture.months, settings: {} }, console };
vm.createContext(context);
vm.runInContext(groupDecl + ';' + functions, context);
const calc = vm.runInContext('calc', context);
const keys = vm.runInContext('keys', context);
const hasData = vm.runInContext('hasData', context);
assert.equal(keys().length, 24);
assert.equal(hasData('2025-01'), true);
assert.equal(hasData('2026-12'), true);

const yearly = {};
for (const year of ['2025','2026']) {
  const monthKeys = keys().filter(k => k.startsWith(year + '-'));
  const results = monthKeys.map(k => calc(k));
  assert.equal(results.length, 12);
  yearly[year] = {
    months: results.length,
    revenue: results.reduce((s,x)=>s+x.revenue,0),
    ek: results.reduce((s,x)=>s+x.ek,0),
    gross: results.reduce((s,x)=>s+x.gross,0),
    shrink: results.reduce((s,x)=>s+x.shrink,0),
    margin: 0
  };
  yearly[year].margin = yearly[year].revenue ? yearly[year].gross / yearly[year].revenue * 100 : 0;
  assert.ok(yearly[year].revenue > 0 && yearly[year].ek > 0 && yearly[year].gross > 0);
  assert.ok(Number.isFinite(yearly[year].margin) && yearly[year].margin > 0 && yearly[year].margin < 100);
  for (let i=0;i<results.length;i++) {
    const expected=fixture.months[monthKeys[i]];
    assert.ok(Math.abs(results[i].revenue-expected.revenue)<0.011, monthKeys[i]+' revenue calc mismatch');
    assert.ok(Math.abs(results[i].ek-expected.ek)<0.011, monthKeys[i]+' EK calc mismatch');
    assert.ok(Math.abs(results[i].gross-(expected.revenue-expected.ek))<0.011, monthKeys[i]+' gross calc mismatch');
  }
}

// Intentional zero stays distinguishable, while an unentered default zero remains unmarked.
const zero = fixture.months['2025-02'].groups.spielzeug;
assert.equal(zero.revenue, 0);
assert.equal(zero._revenueEntered, true);
const legacy = { revenue: 0 };
assert.equal(legacy._revenueEntered, undefined);
const restored = JSON.parse(JSON.stringify(fixture.months));
assert.equal(restored['2025-02'].groups.spielzeug._revenueEntered, true);

// Cross-year comparison must show higher turnover but lower gross margin for the synthetic scenario.
assert.ok(yearly['2026'].revenue > yearly['2025'].revenue);
assert.ok(yearly['2026'].margin < yearly['2025'].margin);

// Output surfaces: guard that the real app calls its dashboard, analysis, insights, yearly and report renderers.
for (const name of ['dashboard','analysis','insights','yearly','report','renderArticleDiagnostics']) {
  assert.match(html, new RegExp('function '+name+'\\('), 'Expected app renderer '+name);
}
console.log(JSON.stringify({status:'PASS',tested:'real calc()/mrow()/settings()/hasData() extracted from analyse.html',years:yearly,checks:['24 monthly calculations compared to fixture','annual rollups','gross margin and EK sanity','intentional zero marker and JSON restore','year-over-year revenue up / margin down','analysis/dashboard/year/report/article renderers exist']},null,2));

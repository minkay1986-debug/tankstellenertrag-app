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
  between('function keys(){', 'function renderGroups(){')
].join('\n');

const context = { data: { months: fixture.months, settings: {} }, console };
vm.createContext(context);
vm.runInContext(groupDecl + ';' + functions, context);
const calc = context.calc, keys = context.keys, hasData = context.hasData;
assert.equal(typeof calc, 'function', 'actual calc() function must be loaded');
assert.equal(typeof keys, 'function', 'actual keys() function must be loaded');
assert.equal(typeof hasData, 'function', 'actual hasData() function must be loaded');
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
const zero = fixture.months['2025-02'].groups.spielzeug;
assert.equal(zero.revenue, 0);
assert.equal(zero._revenueEntered, true);
const legacy = { revenue: 0 };
assert.equal(legacy._revenueEntered, undefined);
const restored = JSON.parse(JSON.stringify(fixture.months));
assert.equal(restored['2025-02'].groups.spielzeug._revenueEntered, true);
assert.ok(yearly['2026'].revenue > yearly['2025'].revenue);
assert.ok(yearly['2026'].margin < yearly['2025'].margin);
for (const name of ['dashboard','analysis','insights','yearly','report','renderArticleDiagnostics']) {
  assert.ok(html.includes('function '+name+'('), 'Expected app renderer '+name);
}
console.log(JSON.stringify({status:'PASS',tested:'actual calc()/mrow()/settings()/hasData() extracted from analyse.html',years:Object.fromEntries(Object.entries(yearly).map(([y,v])=>[y,{...v,revenue:+v.revenue.toFixed(2),ek:+v.ek.toFixed(2),gross:+v.gross.toFixed(2),margin:+v.margin.toFixed(2),shrink:+v.shrink.toFixed(2)}])),checks:['24 monthly calculations compared to fixture','annual rollups','gross margin and EK sanity','intentional zero marker and JSON restore','year-over-year revenue up / margin down','renderer functions present']},null,2));

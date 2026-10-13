import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const fixture = JSON.parse(readFileSync(new URL('./two-year-test-data.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../analyse.html', import.meta.url), 'utf8');
const start = html.indexOf('function dashboard(){');
const end = html.indexOf('function renderMeinMonat(){', start);
assert.ok(start >= 0 && end > start, 'Could not extract actual dashboard renderer');
const dashboardSource = html.slice(start, end);

function makeContext(months) {
  const elements = Object.fromEntries(['kpis','dashAlerts','trend'].map(id => [id,{innerHTML:''}]));
  const context = {
    data: { months, settings: {} },
    station: { station_name:'Teststation', postcode:'00000', city:'Testort' },
    console,
    $: id => elements[id] || (elements[id] = {innerHTML:''}),
    month: () => '2026-06',
    prev: k => { const [y,m]=k.split('-').map(Number); return m===1?null:y+'-'+String(m-1).padStart(2,'0'); },
    keys: () => Object.keys(months).sort(),
    hasData: k => !!months[k],
    calc: k => {
      const m=months[k] || {};
      const groups=Object.entries(m.groups || {}).map(([id,g])=>({id,name:id,revenue:Number(g.revenue)||0,ek:Number(g.ek)||0,gross:(Number(g.revenue)||0)-(Number(g.ek)||0),margin:Number(g.revenue)?((Number(g.revenue)-Number(g.ek))/Number(g.revenue))*100:0,shrink:Number(g.shrink)||0,writeoff:Number(g.writeoff)||0,stock:Number(g.stock)||0}));
      const revenue=Number(m.revenue)||0, ek=Number(m.ek)||0;
      return {revenue,ek,gross:revenue-ek,margin:revenue?(revenue-ek)/revenue*100:0,shrink:Number(m.shrink)||0,stock:Number(m.stock)||0,writeoff:Number(m.writeoff)||0,groups};
    },
    eur: n => Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:0})+' €',
    pct: n => Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' %',
    esc: s => String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])),
    wowPriority: () => [],
    wowCard: () => '',
    riskStatusPanel: () => '',
    dataQuality: () => [],
    settings: () => ({revenueDrop:5,marginDrop:.5,shrinkRate:1,writeoffRate:.5,stockIncrease:5})
  };
  vm.createContext(context);
  vm.runInContext(dashboardSource,context);
  context.dashboard();
  return elements;
}
const first=makeContext(fixture.months);
const firstSvg=first.trend.innerHTML;
assert.ok(firstSvg.includes('<svg'), 'dashboard must render the actual SVG trend chart');
assert.ok(firstSvg.includes('stroke="#4cc9ff"'), 'current year line should be rendered');
assert.ok(firstSvg.includes('stroke="#ffad62"'), 'previous year line should be rendered');
assert.ok(firstSvg.includes('2026') && firstSvg.includes('2025'), 'chart legend should include current and previous years');
assert.ok(firstSvg.includes('M '), 'chart must contain a calculated path');

const changed=JSON.parse(JSON.stringify(fixture.months));
changed['2026-06'].revenue += 12000;
changed['2026-06'].ek += 1000;
const second=makeContext(changed);
const secondSvg=second.trend.innerHTML;
assert.notEqual(secondSvg,firstSvg,'trend chart HTML must react to changed monthly data');
const path1=firstSvg.match(/<path d="(M [^"]*)" fill="none" stroke="#4cc9ff"/)?.[1];
const path2=secondSvg.match(/<path d="(M [^"]*)" fill="none" stroke="#4cc9ff"/)?.[1];
assert.ok(path1 && path2,'current-year SVG curve path must exist');
assert.notEqual(path1,path2,'current-year curve coordinates must change after editing the selected month values');
assert.ok(secondSvg.includes('2026-06'), 'selected month must remain identified in chart');
console.log(JSON.stringify({status:'PASS',tested:'actual dashboard() SVG trend renderer extracted from analyse.html',mutation:{month:'2026-06',revenueDelta:12000,ekDelta:1000},checks:['SVG chart rendered','current and previous year series rendered','chart HTML changes with monthly values','current-year path coordinates react to mutation','selected month remains marked']},null,2));

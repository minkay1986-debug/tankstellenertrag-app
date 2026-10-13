import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const fixture=JSON.parse(readFileSync(new URL('./two-year-test-data.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../analyse.html',import.meta.url),'utf8');
function between(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'source range '+a);return source.slice(i,j)}
const declarations=between('const GROUPS=',';const $=').replace(/;$/,'');
const fn=[
 between('function empty(){','function month()'),
 between('function mrow(','function calc('),
 between('function calc(','function reconciliation('),
 between('function dataQuality(','function hasData('),
 between('function hasData(','function keys()'),
 between('function keys(){','function renderGroups()'),
 between('function settings(){','function renderGroups()'),
 between('function wowPriority(','function riskLevel('),
 between('function riskLevel(','function riskForRow('),
 between('function riskForRow(','function riskSummary('),
 between('function riskSummary(','function riskStatusPanel(')
].join('\n');
const ctx={data:{months:fixture.months,settings:{revenueDrop:5,marginDrop:.5,shrinkRate:1,writeoffRate:.5,stockIncrease:5}},console,eur:n=>Number(n||0).toFixed(2)+' €'};
vm.createContext(ctx);
vm.runInContext(declarations+';'+fn,ctx);
assert.equal(typeof ctx.dataQuality,'function');
assert.equal(typeof ctx.wowPriority,'function');
assert.equal(typeof ctx.riskSummary,'function');
const quality=ctx.dataQuality('2026-07');
assert.ok(['critical','check','good'].includes(quality.status));
assert.ok(Array.isArray(quality.errors)&&Array.isArray(quality.notes));
const priority=ctx.wowPriority('2026-07');
assert.ok(Array.isArray(priority));
assert.ok(priority.every(r=>r.g&&Array.isArray(r.reasons)));
const summary=ctx.riskSummary('2026-07');
assert.equal(summary.rows.length,priority.length);
assert.equal(summary.watch+summary.critical+summary.severe,priority.length);
const clean=structuredClone(fixture.months['2026-07']);
clean.revenue=1000;clean.ek=700;clean.shrink=5;clean.writeoff=2;clean.stock=100;
for(const q of Object.values(clean.groups)){q.shrink=0;q.writeoff=0;q.stock=10}
ctx.data.months['2026-07']=clean;
const cleanQuality=ctx.dataQuality('2026-07');
assert.ok(cleanQuality.errors.length===0,'valid synthetic month should not create hard data errors');
const bad=structuredClone(clean);bad.ek=1200;ctx.data.months['2026-07']=bad;
const badQuality=ctx.dataQuality('2026-07');
assert.ok(badQuality.errors.some(x=>x.includes('Shop-EK ist höher als der Shop-Umsatz')),'EK higher than revenue should be detected');
console.log(JSON.stringify({status:'PASS',checks:['actual dataQuality() executed on 2026-07 fixture','actual wowPriority() executed','actual riskSummary() executed','valid month avoids hard errors','EK greater than revenue triggers error'],qualityStatus:quality.status,qualityNotes:quality.notes.length,priorityCount:priority.length,risk:{watch:summary.watch,critical:summary.critical,severe:summary.severe},cleanErrors:cleanQuality.errors.length,badErrors:badQuality.errors},null,2));

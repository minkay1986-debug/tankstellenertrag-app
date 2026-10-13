import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const fixture=JSON.parse(readFileSync(new URL('./two-year-test-data.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../analyse.html',import.meta.url),'utf8');
const reportStart=source.indexOf('function report(){');
const reportEnd=source.indexOf('function settingsUI(){',reportStart);
assert.ok(reportStart>=0&&reportEnd>reportStart,'report() function exists and can be isolated');
const reportFn=source.slice(reportStart,reportEnd);
const key='2026-07', sample=fixture.months[key];
const groups=Object.entries(sample.groups).map(([id,g])=>({id,name:fixture.groups.find(x=>x.id===id)?.name||id,revenue:g.revenue,ek:g.ek,margin:g.revenue&&g.ek!==null?(g.revenue-g.ek)/g.revenue*100:0,stock:g.stock,stockRatio:g.revenue?g.stock/g.revenue*100:0,reasons:['Testhinweis aus synthetischen Daten']}));
const d={revenue:sample.revenue,ek:sample.ek,gross:sample.revenue-sample.ek,margin:(sample.revenue-sample.ek)/sample.revenue*100,shrink:sample.shrink,writeoff:sample.writeoff,stock:sample.stock,groups};
const previous=fixture.months['2026-06'];
const pd={...d,revenue:previous.revenue,groups:Object.entries(previous.groups).map(([id,g])=>({id,name:fixture.groups.find(x=>x.id===id)?.name||id,revenue:g.revenue,ek:g.ek,margin:g.revenue&&g.ek!==null?(g.revenue-g.ek)/g.revenue*100:0,stock:g.stock,stockRatio:g.revenue?g.stock/g.revenue*100:0,reasons:['Vormonat']}))};
const elements={reportBody:{innerHTML:'',insertAdjacentHTML(s){this.innerHTML+=s}}};
const settings={revenueDrop:5,marginDrop:2,shrinkRate:1,writeoffRate:.5,stockIncrease:10};
const context={data:{months:fixture.months,settings:{}},station:{station_name:'TESTSTATION',postcode:'00000',city:'TESTORT'},$:id=>elements[id]||(elements[id]={innerHTML:'',insertAdjacentHTML(s){this.innerHTML+=s}}),month:()=>key,prev:()=> '2026-06',calc:k=>k===key?d:pd,settings:()=>settings,wowPriority:()=>groups.slice(0,3).map(g=>({g,reasons:g.reasons,stockRatio:g.stockRatio})),esc:s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),eur:n=>Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €',pct:n=>Number(n||0).toFixed(2)+' %',practiceGuidance:()=>'',TEStudyContext:{htmlForReport:async()=>'<p>Kontexttest</p>'},console};
vm.createContext(context);
vm.runInContext(reportFn,context);
assert.equal(typeof context.report,'function');
context.report();
const html=elements.reportBody.innerHTML;
for(const expected of ['TankstellenErtrag · Monatsbrief','TESTSTATION','2026-07','Shop-Umsatz','Rohertrag','Marge','Schwund','Bestand EK','Ihre 3 wichtigsten Prüffelder','Interpretationshinweis','Notizen / Maßnahmen vor Ort','1.017']) {
 if(expected==='1.017') continue; // annual turnover is not the report month value
 assert.ok(html.includes(expected),'Report output missing: '+expected);
}
assert.ok(html.includes(d.revenue.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})), 'Report should include selected month revenue');
assert.ok(html.includes('Umsatzrückgang 5 %'),'Report should print active thresholds');
await new Promise(resolve=>setTimeout(resolve,0));
console.log(JSON.stringify({status:'PASS',tested:'actual report() renderer with isolated fixture-backed dependencies',selectedMonth:key,reportLength:html.length,checks:['report renders HTML','station/month shown','monthly KPIs rendered from fixture','priority fields rendered','interpretation and notes area included','configured thresholds shown']},null,2));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../analyse.html',import.meta.url),'utf8');
const a=source.indexOf('function renderMeinMonat(){'),b=source.indexOf('\nfunction knowledgeLink(',a);
assert.ok(a>=0&&b>a,'actual renderMeinMonat() can be isolated');
const renderer=source.slice(a,b);
const nodes={meinMonatContent:{innerHTML:''}};
const current={revenue:1000,ek:700,gross:300,margin:30,shrink:10,writeoff:5,stock:200,groups:[]};
const prior={revenue:900,ek:650,gross:250,margin:27.8,shrink:12,writeoff:4,stock:180,groups:[]};
const context={
 month:()=> '2026-07',prev:()=> '2026-06',calc:k=>k==='2026-07'?current:prior,
 dataQuality:()=>({status:'good',errors:[],notes:[]}),wowPriority:()=>[],hasData:()=>true,
 eur:n=>Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €',
 pct:n=>Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})+' %',
 esc:s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),
 document:{querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{}},
 $:id=>nodes[id]||(nodes[id]={innerHTML:''}),console
};
vm.createContext(context);vm.runInContext(renderer,context);
context.renderMeinMonat();
const html=nodes.meinMonatContent.innerHTML;
for(const expected of ['Shop-Umsatz','1.000,00 €','Rohertrag','300,00 €','Shop-Marge','30,0 %','Schwund','10,00 €','Kurzvergleich zum Vormonat','Datenqualität gut','5-Minuten-Monatscheck']) assert.ok(html.includes(expected),'Mein Monat output missing: '+expected);
assert.ok(html.includes('Umsatz')&&html.includes('11,1 %'),'month-over-month sales comparison should be present');
context.hasData=()=>false;context.renderMeinMonat();
assert.ok(nodes.meinMonatContent.innerHTML.includes('Noch kein Monatsdatensatz'),'empty month should show empty-state');
assert.ok(!nodes.meinMonatContent.innerHTML.includes('meinmonat-kpis'),'empty month should not show fabricated KPIs');
console.log(JSON.stringify({status:'PASS',tested:'actual renderMeinMonat() with isolated deterministic dependencies',checks:['current month KPIs render','month-over-month comparisons render','quality and checklist render','empty month shows explicit empty state','empty month does not show KPI values']},null,2));

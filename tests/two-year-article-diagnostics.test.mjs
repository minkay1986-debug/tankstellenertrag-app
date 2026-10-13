import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const fixture=JSON.parse(readFileSync(new URL('./two-year-test-data.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../analyse.html',import.meta.url),'utf8');
const a=source.indexOf('function renderArticleDiagnostics('), b=source.indexOf('\nasync function saveArticleDiagnostic(',a);
assert.ok(a>=0&&b>a,'actual article renderer can be isolated');
const html=source.slice(a,b);
const outputs={adResults:{innerHTML:''},adMonth:{value:'2026-07'}};
const data={articleObservations:[{key:'ean:1234567890123',name:'Test-Kaffee',lastSeen:'2026-07',observations:[
 {month:'2026-06',sold:100,opening:50,delivery:80,closing:25,writeoff:5,ek:1.2,vk:2.5,difference:0},
 {month:'2026-07',sold:80,opening:25,delivery:60,closing:0,writeoff:5,ek:1.4,vk:2.5,difference:0}
]}]};
const ctx={data,$:id=>outputs[id]||null,esc:s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),articleHistoryStage:n=>n>=6?'Historie vorhanden':n>=3?'erste Trends möglich':'Aufbauphase'};
vm.createContext(ctx);vm.runInContext(html,ctx);ctx.renderArticleDiagnostics('ean:1234567890123');
const rendered=outputs.adResults.innerHTML;
for(const term of ['Test-Kaffee','Absatz & Prognose','Marge & Gewinnpotenzial','Schwund, Verluste & Ursachenprüfung','44 %','Bestandsbewegung rechnerisch ausgeglichen','Artikelhistorie']) assert.ok(rendered.includes(term),'missing expected article output: '+term);
assert.ok(rendered.includes('80 Stück'),'latest sold quantity should render');
assert.ok(/Rohertrag je Stück: 1,10\s*€/u.test(rendered),'unit gross margin should calculate 2.5 - 1.4');
assert.ok(/88,00\s*€/u.test(rendered),'gross contribution should calculate 1.1 * 80');
assert.ok(rendered.includes('Absatz gesunken um 20 %'),'month-over-month change should be 20 percent down');
const emptyData={articleObservations:[]};ctx.data=emptyData;outputs.adResults.innerHTML='';ctx.renderArticleDiagnostics();assert.ok(outputs.adResults.innerHTML.includes('Noch keine Artikelmonate gespeichert'),'empty history state should render');
console.log(JSON.stringify({status:'PASS',checks:['actual article renderer executes','all three diagnosis cards render','margin and unit gross profit calculated','month-over-month sales change calculated','inventory reconciliation status rendered','empty-history state rendered'],outputLength:rendered.length},null,2));

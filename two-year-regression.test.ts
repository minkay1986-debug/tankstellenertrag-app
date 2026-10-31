import "./ertragsoptimierer.js";
const optimizer = (globalThis as any).TankstellenErtragsoptimierer;
if (!optimizer) throw new Error("Ertragsoptimierer API wurde nicht geladen");
const html = await Deno.readTextFile(new URL("./analyse.html", import.meta.url));
const assert = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
const months = Array.from({length:24},(_,i)=>{const year=2025+Math.floor(i/12),month=i%12+1;const seasonal=[.86,.88,.93,.96,1.02,1.08,1.16,1.13,1.04,.99,.94,1.12][month-1];const revenue=Math.round(100000*seasonal*(year===2026?1.04:1)*100)/100;const marginPct=year===2026&&month>=6?48:52;const shrinkPct=year===2026&&month===10?3.2:.8;return{key:`${year}-${String(month).padStart(2,"0")}`,year,month,revenue,ek:revenue*(1-marginPct/100),marginPct,shrinkPct};});
Deno.test("24-month fixture covers two complete years without duplicate keys",()=>{assert(months.length===24,"Expected 24 months");assert(months[0].key==="2025-01"&&months[11].key==="2025-12","2025 range incorrect");assert(months[12].key==="2026-01"&&months[23].key==="2026-12","2026 range incorrect");assert(new Set(months.map(x=>x.key)).size===24,"Duplicate month key");});
Deno.test("all 24 monthly report calculations preserve revenue and margin",()=>{for(const m of months){const prior=months.find(x=>x.key===`${m.year-1}-${String(m.month).padStart(2,"0")}`);const prev=months.find(x=>x.key===`${m.year}-${String(m.month-1).padStart(2,"0")}`)||months.find(x=>x.key===`${m.year-1}-12`);const r=optimizer.evaluateGroup({name:"Shop",actualRevenue:m.revenue,previousRevenue:prev?.revenue??null,priorYearRevenue:prior?.revenue??null,marginPct:m.marginPct,previousMarginPct:prev?.marginPct??null,shrinkPct:m.shrinkPct,dataComplete:true});assert(r.actualRevenue===m.revenue,`${m.key}: revenue mismatch`);assert(r.marginPct===m.marginPct,`${m.key}: margin mismatch`);if(prior)assert(Number.isFinite(r.expectedRevenue),`${m.key}: expected revenue missing`);}});
Deno.test("annual aggregation and year-on-year growth reconcile",()=>{const y25=months.filter(x=>x.year===2025).reduce((s,x)=>s+x.revenue,0),y26=months.filter(x=>x.year===2026).reduce((s,x)=>s+x.revenue,0);assert(y26>y25,"2026 should exceed 2025");assert(Math.abs((y26/y25-1)*100-4)<.02,"Expected approximately +4% YoY");assert(months.filter(x=>x.year===2025).length===12&&months.filter(x=>x.year===2026).length===12,"Each year must contain 12 months");});
Deno.test("known shrink incident is retained without claiming a cause",()=>{const m=months.find(x=>x.key==="2026-10")!;const r=optimizer.evaluateGroup({name:"Shop",actualRevenue:m.revenue,previousRevenue:months.find(x=>x.key==="2026-09")!.revenue,priorYearRevenue:months.find(x=>x.key==="2025-10")!.revenue,marginPct:m.marginPct,previousMarginPct:48,shrinkPct:m.shrinkPct,dataComplete:true});assert(r.shrinkPct===3.2,"October shrink spike lost");assert(!r.alerts.some((a:any)=>/Diebstahl|Ursache bewiesen/i.test(a.title+" "+a.detail)),"Unproven cause was asserted");});
Deno.test("margin drop and partial-year safeguards remain wired",()=>{assert(html.includes("Ist-Marge um "),"Margin-drop signal missing");assert(html.includes("r.marginDrop>=s.marginDrop"),"Margin drop does not affect severity");assert(html.includes("unvollständig – nur erfasste Monate"),"Partial years not marked");assert(html.includes("g?.revenue,g?.ek,g?.shrink,g?.writeoff,g?.stock"),"Inventory-only months excluded");});

/** Extracts the real named app function from the single-file app so tests execute production logic, not a copied formula. */
function appFunction(name: string, nextName: string, params: string[], deps: Record<string, unknown>): (...args: any[]) => any {
  const start = html.indexOf(`function ${name}(`);
  const end = html.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `Could not locate app function ${name}`);
  const source = html.slice(start, end).trim();
  const factory = new Function(...params, `${source}; return ${name};`);
  return factory(...params.map((p) => deps[p]));
}
const groupDefs = [
  ["backshop","Backwaren",59.2],["kaffee","Kaffee",55],["süsswaren","Süßwaren",50],
  ["drogerie","Drogerie",50],["lebensmittel","Lebensmittel",50],["spielzeug","Spielzeug",45],
  ["waschen","Waschen",0],["getraenke","Getränke",50],["eis","Eis",56.8]
];
function appFixture() {
  const data: any = {months:{},settings:{revenueDrop:5,marginDrop:.5,shrinkRate:1,writeoffRate:.5,stockIncrease:5,targetMargins:{}}};
  for (const m of months) {
    const groupRevenue = m.revenue / 8;
    const groups: Record<string,any> = {};
    for (const [id,,target] of groupDefs) groups[id] = {revenue:id==="waschen"?0:groupRevenue,ek:id==="waschen"?0:groupRevenue*(1-m.marginPct/100),margin:target,shrink:id==="backshop"&&m.key==="2026-10"?groupRevenue*.032:groupRevenue*.008,writeoff:groupRevenue*.002,stock:groupRevenue*.4};
    data.months[m.key] = {revenue:m.revenue,ek:m.ek,shrink:m.revenue*m.shrinkPct/100,writeoff:m.revenue*.002,stock:m.revenue*.4,groups};
  }
  return data;
}
function runtime(data:any) {
  const GROUPS = groupDefs;
  const settings = () => ({...{revenueDrop:5,marginDrop:.5,shrinkRate:1,writeoffRate:.5,stockIncrease:5,targetMargins:{}},...(data.settings||{})});
  const mrow = (k:string) => data.months[k];
  const prev = (k:string) => {const [y,mo]=k.split("-").map(Number);const d=new Date(y,mo-2,1);const p=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return Object.hasOwn(data.months,p)?p:null;};
  const calc = appFunction("calc","reconciliation",["GROUPS","data","settings","mrow"],{GROUPS,data,settings,mrow});
  const wowPriority = appFunction("wowPriority","riskLevel",["calc","prev","settings"],{calc,prev,settings});
  const keys = () => Object.keys(data.months).sort();
  const eur = (v:number) => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v)||0);
  const pct = (v:number) => (Number(v)||0).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" %";
  const target = {value:"",innerHTML:""};
  const yearly = appFunction("yearly","economic",["keys","data","calc","eur","pct","$"],{keys,data,calc,eur,pct,$:(id:string)=>target});
  const practiceGuidance = appFunction("practiceGuidance","wowCard",[],{});
  const report = appFunction("report","settingsUI",["calc","month","settings","wowPriority","prev","eur","pct","esc","$","station","TEStudyContext","practiceGuidance"],{
    calc,month:()=> "2026-10",settings,wowPriority,prev,eur,pct,esc:(v:unknown)=>String(v??""),$:(id:string)=>target,
    station:{station_name:"Teststation",postcode:"00000",city:"Testort"},
    TEStudyContext:{htmlForReport:async()=>""},practiceGuidance
  });
  return {data,calc,wowPriority,yearly,report,practiceGuidance,target,prev};
}
Deno.test("real app calc, year table and report reconcile across all 24 months",()=>{
  const rt=runtime(appFixture());
  for(const m of months){const d=rt.calc(m.key);assert(Math.abs(d.revenue-m.revenue)<.011,`${m.key}: app calc revenue mismatch ${d.revenue} vs ${m.revenue}`);assert(Math.abs(d.gross-(m.revenue-m.ek))<.02,`${m.key}: app gross mismatch`);assert(Math.abs(d.margin-m.marginPct)<.001,`${m.key}: app margin mismatch`);}
  rt.yearly();
  assert(rt.target.innerHTML.includes("2025")&&rt.target.innerHTML.includes("2026"),"Actual yearly renderer omitted a year");
  assert(rt.target.innerHTML.includes("12/12 Monate · vollständig"),"Actual yearly renderer failed full-year status");
  const y25=months.filter(x=>x.year===2025).reduce((a,x)=>a+x.revenue,0);
  const y26=months.filter(x=>x.year===2026).reduce((a,x)=>a+x.revenue,0);
  assert(rt.target.innerHTML.replace(/[\s\u00a0\u202f]+/g," ").includes(eurForTest(y25))&&rt.target.innerHTML.replace(/[\s\u00a0\u202f]+/g," ").includes(eurForTest(y26)),`Actual yearly totals differ from fixture totals. Expected ${eurForTest(y25)} / ${eurForTest(y26)}; rendered: ${rt.target.innerHTML.slice(0,1200)}`);
  rt.report();
  for(const label of ["Shop-Umsatz","Rohertrag","Marge","Schwund","Bestand EK","2026-10"])assert(rt.target.innerHTML.includes(label),`Actual report missing ${label}`);
  assert(rt.target.innerHTML.replace(/[\s\u00a0\u202f]+/g," ").includes(eurForTest(rt.calc("2026-10").revenue)),"Report revenue differs from app calc");
});
function eurForTest(v:number){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v)||0).replace(/[\s\u00a0\u202f]+/g," ").trim();}
Deno.test("actual app prioritizes an Ist-margin drop and exact calendar month comparison",()=>{
  const rt=runtime(appFixture());
  const rows=rt.wowPriority("2026-06");
  assert(rows.some((r:any)=>r.marginDrop!==null&&r.marginDrop>=.5&&r.reasons.some((x:string)=>x.includes("Ist-Marge"))),"Real app priority logic missed the margin drop");
  assert(rt.prev("2026-01")==="2025-12","January must compare with previous December");
  delete rt.data.months["2025-12"];
  assert(rt.prev("2026-01")===null,"Missing prior calendar month must not compare against an older recorded month");
});
Deno.test("actual app year renderer marks a partial year and includes inventory-only month",()=>{
  const rt=runtime(appFixture());
  delete rt.data.months["2025-11"];
  rt.data.months["2025-12"]={revenue:0,ek:0,shrink:0,writeoff:0,stock:0,groups:{backshop:{revenue:0,ek:250,shrink:0,writeoff:0,stock:400}}};
  rt.yearly();
  assert(rt.target.innerHTML.includes("10/12 Monate · unvollständig"),`Actual year renderer did not mark partial year: ${rt.target.innerHTML.slice(0,1200)}`);
  assert(rt.target.innerHTML.includes("2025-12"),"Inventory-only month was not included in monthly detail");
});

Deno.test("practical guidance is actionable, prioritised and labels missing data",()=>{
  const rt=runtime(appFixture());
  const margin=rt.practiceGuidance({reasons:["Ist-Marge um 2 %-Pkt. gefallen"]});
  assert(margin.includes("KONKRET ZUERST TUN")&&margin.includes("Netto-EK")&&margin.includes("ERFOLGSKONTROLLE"),"Margin guidance lacks concrete checks or measurable follow-up");
  assert(margin.includes("DATENGRUNDLAGE")&&margin.includes("Warengruppen-EK fehlt")&&margin.includes("Vormonat fehlt"),"Missing inputs must be explicitly identified");
  const loss=rt.practiceGuidance({reasons:["Schwund auffällig","Abschriften auffällig","Bestandsquote gestiegen"]});
  assert(loss.includes("Inventur")&&loss.includes("Warenzugänge")&&loss.includes("Bestandswert")&&loss.includes("DATENGRUNDLAGE"),"Loss/inventory guidance lacks relevant checks or data-quality notes");
  assert(!loss.includes("keine Bestellung oder Preisänderung automatisch ausgelöst"),"Remove irrelevant automated-action disclaimer");
  const sales=rt.practiceGuidance({reasons:["Umsatz rückläufig"]});
  assert(sales.includes("Öffnungstage")&&sales.includes("drei Artikel")&&sales.includes("ERFOLGSKONTROLLE"),"Sales guidance must prioritise comparable trading days and a concrete follow-up");
  assert(html.includes("'+practiceGuidance(r)+'</div>'")||html.includes("practiceGuidance(r)"),"Guidance is not wired into the real advisory tile/report renderer");
});

Deno.test("app has all requested renderers and renderAll calls them",()=>{for(const fn of ["function renderMeinMonat()","function yearly()","function report()","function analysis()","function renderAll()"])assert(html.includes(fn),"Missing "+fn);const renderAllFn=html.slice(html.indexOf("function renderAll()"),html.indexOf("function parseHuth("));assert(["renderMeinMonat()","analysis()","yearly()","report()"].every(call=>renderAllFn.includes(call)),"renderAll must invoke month, analysis, year and report renderers");for(const id of ['id="monthly"','id="yearly"','id="report"','id="dashboard"'])assert(html.includes(id),"Missing section "+id);const yearFn=html.slice(html.indexOf("function yearly()"),html.indexOf("function economic()"));assert(yearFn.includes("Jahresübersicht")&&yearFn.includes("gewichtete Marge"),"Yearly view must show annual totals and weighted margin");const monthFn=html.slice(html.indexOf("function renderMeinMonat()"),html.indexOf("function renderCustomScenarioInputs"));for(const check of ["focus","shrink","action"])assert(monthFn.includes(check),"Missing monthly check tile "+check);const analysisFn=html.slice(html.indexOf("function analysis()"),html.indexOf("function renderCustomScenarioInputs"));assert(analysisFn.includes("Daten-TÜV")&&analysisFn.includes("Bestandsabgleich")&&analysisFn.includes("Ihre wichtigsten Prüffelder"),"Analysis is missing a required check area");const reportFn=html.slice(html.indexOf("function report()"),html.indexOf("function settingsUI()"));for(const item of ["Shop-Umsatz","Rohertrag","Marge","Schwund","Bestand EK","Notizen / Maßnahmen"])assert(reportFn.includes(item),"Report missing "+item);});

Deno.test("advice separates achieved margin target from operational review risk",()=>{
  const rt=runtime(appFixture());
  const m=rt.data.months["2026-10"];
  const backshop=m.groups.backshop;
  backshop.ek=backshop.revenue*.40;
  backshop._ekEntered=true;
  backshop.shrink=backshop.revenue*.032;
  backshop.writeoff=backshop.revenue*.002;
  const row=rt.wowPriority("2026-10").find((x:any)=>x.g.id==="backshop");
  assert(!!row,"Backshop advice row missing");
  assert(row.g.actualMargin>=row.g.margin,"Fixture must reach the margin target");
  assert(row.reasons.includes("Schwund auffällig"),"High shrink must remain a review signal");
  assert(!row.reasons.some((x:string)=>x.includes("Marge")),"Reached margin target must not be called a margin drop");
  assert(html.includes("Ist-Marge '+pct(actual)+' · Ziel erreicht"),"Card must render margin target state independently");
  assert(html.includes("PRÜFBEDARF · ' +risk.label")||html.includes("PRÜFBEDARF · "+ " ' +risk.label"),"Review-risk badge must be explicitly separated from margin state");
});

Deno.test("advice potential is only calculated for matching detected shrink/write-off signals",()=>{
  const rt=runtime(appFixture());
  const measure=appFunction("measurePotential","potentialHtml",["r"],{});
  const potential=appFunction("potentialHtml","wowCard",["r"],{measurePotential:measure,eur:(v:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v)});
  const salesOnly={reasons:["Umsatz rückläufig"],g:{shrink:128,writeoff:64}};
  assert(measure(salesOnly).length===0,"Sales-only alert must not inherit unrelated shrink/write-off euro potential");
  assert(potential(salesOnly).includes("kein pauschaler Gewinnbetrag")||potential(salesOnly).includes("kein Euro-Betrag")||potential(salesOnly).includes("kein"),"Sales-only advice must explain why no euro potential is calculated");
  const shrinkOnly={reasons:["Schwund auffällig"],g:{shrink:128,writeoff:64}};
  const parts=measure(shrinkOnly);
  assert(parts.length===1&&parts[0].label==="Schwund","Only the detected shrink signal may contribute");
  assert(Math.abs(parts[0].amount-12.8)<.001,"Shrink scenario must calculate 10% of the monthly shrink amount");
  const combined={reasons:["Schwund auffällig","Abschriften auffällig"],g:{shrink:128,writeoff:64}};
  assert(measure(combined).length===2,"Both signals may be shown separately, with overlap warning");
});

Deno.test("missing comparison month suppresses trend-based advice instead of using an older month",()=>{
  const rt=runtime(appFixture());
  delete rt.data.months["2026-09"];
  const rows=rt.wowPriority("2026-10");
  assert(rows.every((r:any)=>!r.reasons.includes("Umsatz rückläufig")&&!r.reasons.some((x:string)=>x.includes("Marge"))),"Missing September must not be replaced by an older comparison month");
});

Deno.test("threshold boundaries are inclusive and invalid optimizer inputs are not fabricated",()=>{
  const at=optimizer.evaluateGroup({name:"Grenzfall",actualRevenue:1000,previousRevenue:1000,priorYearRevenue:1000,marginPct:50,previousMarginPct:52,shrinkPct:4.01,dataComplete:true});
  assert(at.alerts.some((a:any)=>a.code==="MARGIN_DROP"),"A 2 percentage-point margin drop must trigger at the boundary");
  assert(at.alerts.some((a:any)=>a.code==="SHRINK_REVIEW"),"Shrink above the 4% review threshold must trigger review");
  const missing=optimizer.evaluateGroup({name:"Unvollständig",actualRevenue:1000,previousRevenue:null,priorYearRevenue:null,marginPct:null,previousMarginPct:null,shrinkPct:null,dataComplete:false});
  assert(missing.expectedRevenue===null&&missing.varianceEuro===null,"Missing baseline must not produce a fabricated euro variance");
  assert(missing.confidence==="low","Incomplete inputs must lower confidence");
});

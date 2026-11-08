import "./ertragsoptimierer.js";
const optimizer = (globalThis as any).TankstellenErtragsoptimierer;
if (!optimizer) throw new Error("Ertragsoptimierer API wurde nicht geladen");
const html = await Deno.readTextFile(new URL("./analyse.html", import.meta.url));
const assert = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
const months = Array.from({length:24},(_,i)=>{const year=2025+Math.floor(i/12),month=i%12+1;const seasonal=[.86,.88,.93,.96,1.02,1.08,1.16,1.13,1.04,.99,.94,1.12][month-1];const revenue=Math.round(100000*seasonal*(year===2026?1.04:1)*100)/100;const marginPct=year===2026&&month>=6?48:52;const shrinkPct=year===2026&&month===10?3.2:.8;return{key:`${year}-${String(month).padStart(2,"0")}`,year,month,revenue,ek:revenue*(1-marginPct/100),marginPct,shrinkPct};});
Deno.test("24-month fixture covers two complete years without duplicate keys",()=>{assert(months.length===24,"Expected 24 months");assert(months[0].key==="2025-01"&&months[11].key==="2025-12","2025 range incorrect");assert(months[12].key==="2026-01"&&months[23].key==="2026-12","2026 range incorrect");assert(new Set(months.map(x=>x.key)).size===24,"Duplicate month key");});
Deno.test("advisory follow-up requires the independent confirmed write-off source",()=>{
  const outcome=appFunction("calculateAdvisoryOutcome","initAdvisorCaseActions",[],{});
  const c={groupId:"backshop",measures:["Abschriften reduzieren"],baseline:{writeoffRate:1,writeoffConfirmed:true,revenue:1000,revenueConfirmed:true}};
  const d={sourceShrink:true,sourceWriteoff:false,groups:[{id:"backshop",revenue:1000,revenueEntered:true,writeoff:20,writeoffEntered:true}]};
  assert(outcome(c,d).length===0,"Shrink confirmation alone must not validate write-off follow-up");
  d.sourceWriteoff=true;
  assert(outcome(c,d).some((m:any)=>m.key==="writeoffRate"),"Confirmed write-off source must enable the write-off follow-up metric");
});
Deno.test("trend coverage excludes future calendar months after the selected reporting month",()=>{
  const rt=runtime(appFixture());
  const rows=Array.from({length:12},(_,i)=>i<10?{month:i+1}:null);
  const coverage=rt.trendCoverage(rows,10);
  assert(coverage.count===10&&coverage.expected===10&&coverage.missing===0&&coverage.complete,
    "A Jan–Oct reporting period must be complete without counting Nov/Dec as missing");
  const gap=rt.trendCoverage(rows.map((x,i)=>i===8?null:x),10);
  assert(gap.count===9&&gap.missing===1&&!gap.complete,
    "A missing month inside the selected period must remain visible as a real gap");
});
Deno.test("unconfirmed write-offs cannot raise the risk status when only shrink is confirmed",()=>{
  const rt=runtime(appFixture());
  const row={targetMarginGap:null,marginDrop:null,prevRevenue:0,shrinkRate:null,stockRatioChange:null,prevStockRatio:null,
    g:{revenue:1000,writeoff:80,margin:50},stockMetrics:{excessCapital:null},
    dataStatus:{shrinkSourceAvailable:true,writeoffSourceAvailable:false}};
  assert(rt.riskForRow(row).key==="normal",
    "Unconfirmed write-off values must not create a critical or severe risk signal");
  row.dataStatus.writeoffSourceAvailable=true;
  assert(rt.riskForRow(row).key==="severe",
    "The same write-off rate must be evaluated once its own source is confirmed");
});
Deno.test("modeled potential overlaps gross-profit levers but keeps confirmed shrink and write-offs separate",()=>{
  const rt=runtime(appFixture());
  const row={g:{id:"backshop",revenue:1000,actualMargin:50,margin:55,shrink:20,writeoff:10},
    reasons:["Ist-Marge unter Ihrem Zielwert","Ist-Marge liegt 3 %-Pkt. unter dem Vormonat","Umsatz rückläufig","Schwund auffällig","Abschriften auffällig"],
    targetMarginGap:2,marginDrop:3,prevRevenue:1100,
    dataStatus:{groupEkAvailable:true,monthlySourceAvailable:true,previousMonthAvailable:true,shrinkSourceAvailable:true,writeoffSourceAvailable:true}};
  const parts:any[]=rt.measurePotential(row);
  const gross=parts.filter((p:any)=>p.kind==="zusätzlicher Rohertrag").reduce((sum:number,p:any)=>sum+p.amount,0);
  const savings=parts.filter((p:any)=>p.kind==="direkte Einsparung").reduce((sum:number,p:any)=>sum+p.amount,0);
  assert(Math.abs(gross-12.5)<0.001,"Overlapping margin and sales scenarios must use only the largest gross-profit lever");
  assert(Math.abs(savings-3)<0.001,"Confirmed shrink and write-offs must remain separate 10% savings levers");
  assert(parts.length===3,"Expected one overlap-adjusted gross-profit lever plus two separate loss-reduction levers");
});
Deno.test("all 24 monthly report calculations preserve revenue and margin",()=>{for(const m of months){const prior=months.find(x=>x.key===`${m.year-1}-${String(m.month).padStart(2,"0")}`);const prev=months.find(x=>x.key===`${m.year}-${String(m.month-1).padStart(2,"0")}`)||months.find(x=>x.key===`${m.year-1}-12`);const r=optimizer.evaluateGroup({name:"Shop",actualRevenue:m.revenue,previousRevenue:prev?.revenue??null,priorYearRevenue:prior?.revenue??null,marginPct:m.marginPct,previousMarginPct:prev?.marginPct??null,shrinkPct:m.shrinkPct,dataComplete:true});assert(r.actualRevenue===m.revenue,`${m.key}: revenue mismatch`);assert(r.marginPct===m.marginPct,`${m.key}: margin mismatch`);if(prior)assert(Number.isFinite(r.expectedRevenue),`${m.key}: expected revenue missing`);}});
Deno.test("annual aggregation and year-on-year growth reconcile",()=>{const y25=months.filter(x=>x.year===2025).reduce((s,x)=>s+x.revenue,0),y26=months.filter(x=>x.year===2026).reduce((s,x)=>s+x.revenue,0);assert(y26>y25,"2026 should exceed 2025");assert(Math.abs((y26/y25-1)*100-4)<.02,"Expected approximately +4% YoY");assert(months.filter(x=>x.year===2025).length===12&&months.filter(x=>x.year===2026).length===12,"Each year must contain 12 months");});
Deno.test("known shrink incident is retained without claiming a cause",()=>{const m=months.find(x=>x.key==="2026-10")!;const r=optimizer.evaluateGroup({name:"Shop",actualRevenue:m.revenue,previousRevenue:months.find(x=>x.key==="2026-09")!.revenue,priorYearRevenue:months.find(x=>x.key==="2025-10")!.revenue,marginPct:m.marginPct,previousMarginPct:48,shrinkPct:m.shrinkPct,dataComplete:true});assert(r.shrinkPct===3.2,"October shrink spike lost");assert(!r.alerts.some((a:any)=>/Diebstahl|Ursache bewiesen/i.test(a.title+" "+a.detail)),"Unproven cause was asserted");});
Deno.test("margin drop and partial-year safeguards remain wired",()=>{assert(html.includes("Ist-Marge liegt "),"Margin-drop wording missing");assert(html.includes("r.marginDrop>=s.marginDrop"),"Margin drop does not affect severity");assert(html.includes("unvollständig – nur erfasste Monate"),"Partial years not marked");assert(html.includes("x.sourceInventory===true")&&html.includes("_stockEntered"),"Inventory-only months excluded");});

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
    for (const [id,,target] of groupDefs) groups[id] = {revenue:id==="waschen"?0:groupRevenue,_revenueEntered:id!=="waschen",ek:id==="waschen"?0:groupRevenue*(1-m.marginPct/100),margin:target,shrink:id==="waschen"?0:id==="backshop"&&m.key==="2026-10"?groupRevenue*.032:groupRevenue*.008,writeoff:id==="waschen"?0:groupRevenue*.002,_shrinkEntered:id!=="waschen",_writeoffEntered:id!=="waschen",stock:groupRevenue*.4,_stockEntered:true,openingStock:groupRevenue*.42,_openingStockEntered:true};
    data.months[m.key] = {revenue:m.revenue,ek:m.ek,shrink:Object.values(groups).reduce((sum,g)=>sum+Number(g.shrink||0),0),writeoff:m.revenue*.002,stock:m.revenue*.4,sourceMonthly:true,sourceEK:true,sourceShrink:true,sourceInventory:true,groups};
  }
  return data;
}
function runtime(data:any) {
  const GROUPS = groupDefs;
  const settings = () => ({...{revenueDrop:5,marginDrop:.5,shrinkRate:1,writeoffRate:.5,stockIncrease:5,targetMargins:{}},...(data.settings||{})});
  const mrow = (k:string) => data.months[k];
  const prev = (k:string) => {const [y,mo]=k.split("-").map(Number);const d=new Date(y,mo-2,1);const p=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return Object.hasOwn(data.months,p)?p:null;};
  const calc = appFunction("calc","reconciliation",["GROUPS","data","settings","mrow"],{GROUPS,data,settings,mrow});
  const inventoryMetrics = appFunction("inventoryMetrics","reconciliation",["g","days"],{});

  const learnCalendarEffects = appFunction("learnCalendarEffects","forecastSeason",["months","calFn","calcFn","station"],{station:{city:"Testort"}});
  const wowPriority = appFunction("wowPriority","riskLevel",["calc","prev","settings","data","inventoryMetrics"],{calc,prev,settings,data,inventoryMetrics});
  const keys = () => Object.keys(data.months).sort();
  const eur = (v:number) => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v)||0);
  const eurExact = (v:number) => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  const dataQuality = appFunction("dataQuality","hasData",["mrow","calc","prev","eur","GROUPS"],{mrow,calc,prev,eur,GROUPS});
  const pct = (v:number) => (Number(v)||0).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" %";
  const target = {value:"",innerHTML:""};
  const yearly = appFunction("yearly","economic",["keys","data","calc","eur","pct","$"],{keys,data,calc,eur,pct,$:(id:string)=>target});
  const esc = (v:unknown) => String(v??"");
  const practiceGuidance = appFunction("practiceGuidance","measurePotential",["esc"],{esc});
  const hasData = (k:string) => Object.hasOwn(data.months,k);
  const causeDiagnosis = appFunction("causeDiagnosis","loop",["calc","hasData","month","eur","pct"],{calc,hasData,month:()=>"2026-10",eur,pct});
  const measurePotential = appFunction("measurePotential","potentialHtml",["r"],{});
  const potentialHtml = appFunction("potentialHtml","wowCard",["measurePotential","eur","eurExact"],{measurePotential,eur,eurExact});
  const reportPriorityGuidance = appFunction("reportPriorityGuidance","wowCard",["practiceGuidance","potentialHtml"],{practiceGuidance,potentialHtml});
  const trendCoverage = appFunction("trendCoverage","riskLevel",[],{});
  const riskLevel = appFunction("riskLevel","riskForRow",[],{});
  const riskForRow = appFunction("riskForRow","riskSummary",["settings","riskLevel"],{settings,riskLevel});
  const wowCard = appFunction("wowCard","knowledgeWhy",["riskForRow","eur","pct","esc","reportPriorityGuidance","settings"],{riskForRow,eur,pct,esc,reportPriorityGuidance,settings});
  const grossSafe = appFunction("grossSafe","scenarioResult",[],{});
  const scenarioResult = appFunction("scenarioResult","simulation",["grossSafe"],{grossSafe});
  const report = appFunction("report","settingsUI",["calc","month","settings","wowPriority","prev","eur","pct","esc","$","station","TEStudyContext","reportPriorityGuidance"],{
    calc,month:()=> "2026-10",settings,wowPriority,prev,eur,pct,esc:(v:unknown)=>String(v??""),$:(id:string)=>target,
    station:{station_name:"Teststation",postcode:"00000",city:"Testort"},
    TEStudyContext:{htmlForReport:async()=>""},reportPriorityGuidance
  });
  return {data,calc,wowPriority,yearly,report,practiceGuidance,causeDiagnosis,potentialHtml,reportPriorityGuidance,wowCard,riskForRow,trendCoverage,measurePotential,scenarioResult,inventoryMetrics,dataQuality,learnCalendarEffects,target,prev};
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
Deno.test("priority cards and monthly report share order, guidance and economic scenario values",()=>{
  const rt=runtime(appFixture());
  const rows=rt.wowPriority("2026-10").slice(0,3);
  rt.report();
  const report=String(rt.target.innerHTML);
  assert(rows.length>0,"Synthetic account must produce priority cards");
  let previousIndex=-1;
  for(const [i,row] of rows.entries()){
    const heading=String(i+1).padStart(2,"0")+" · "+row.g.name;
    const index=report.indexOf(heading);
    assert(index>previousIndex,"Report priority order must match the priority-card order: "+heading);
    previousIndex=index;
    const sharedGuidance=rt.reportPriorityGuidance(row);
    const card=rt.wowCard(row,i);
    assert(card.includes(sharedGuidance),"Priority card must use the shared guidance and scenario renderer: "+row.g.name);
    assert(report.includes(sharedGuidance),"Report must include the exact same guidance and scenario block as the priority card: "+row.g.name);
    assert(report.includes(row.reasons.join(" · ")),"Report must retain the same evidence signals as the priority card: "+row.g.name);
  }
  assert(report.includes("ausdrücklich ausgewiesenen Modellannahmen"),"Report must describe potential as a modelled scenario, not as confirmed loss or net profit");
  assert(!report.includes("Ein Euro-Potenzial wird erst in der Simulation"),"Report must not contradict the scenario shown in priority cards");
});

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
  rt.data.months["2025-12"]={revenue:0,ek:0,shrink:0,writeoff:0,stock:0,sourceInventory:true,groups:{backshop:{revenue:0,ek:250,shrink:0,writeoff:0,stock:400,_stockEntered:true}}};
  rt.yearly();
  assert(rt.target.innerHTML.includes("10/12 Monate · unvollständig"),`Actual year renderer did not mark partial year: ${rt.target.innerHTML.slice(0,1200)}`);
  assert(rt.target.innerHTML.includes("2025-12"),"Inventory-only month was not included in monthly detail");
});

Deno.test("practical guidance is actionable, prioritised and labels missing data",()=>{
  const rt=runtime(appFixture());
  const margin=rt.practiceGuidance({reasons:["Ist-Marge um 2 %-Pkt. gefallen"]});
  assert(margin.includes("KONKRET ZUERST TUN")&&margin.includes("Wareneinsatzquote")&&margin.includes("Kategorie-Verkaufspreise")&&margin.includes("ERFOLGSKONTROLLE"),"Margin guidance must use group-level checks and measurable follow-up");
  assert(margin.includes("DATENGRUNDLAGE")&&margin.includes("Warengruppen-EK fehlt")&&margin.includes("Vormonat fehlt"),"Missing inputs must be explicitly identified");
  const loss=rt.practiceGuidance({reasons:["Schwund auffällig","Abschriften auffällig","Bestandsquote gestiegen"]});
  assert(loss.includes("Inventur")&&loss.includes("Warenzugänge")&&loss.includes("Bestandswert")&&loss.includes("DATENGRUNDLAGE"),"Loss/inventory guidance must compare confirmed group movements and stock values");
  assert(!loss.includes("keine Bestellung oder Preisänderung automatisch ausgelöst"),"Remove irrelevant automated-action disclaimer");
  const sales=rt.practiceGuidance({reasons:["Umsatz rückläufig"]});
  assert(sales.includes("Umsatzveränderung")&&sales.includes("Mengendaten")&&sales.includes("ERFOLGSKONTROLLE"),"Sales guidance must explain the group-level comparison and its quantity-data limitation");
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
  assert(html.includes("risk.icon+' PRÜFBEDARF · '+risk.label"),"Review-risk badge must be explicitly separated from margin state");
});

Deno.test("advice potential is only calculated for matching detected shrink/write-off signals",()=>{
  const rt=runtime(appFixture());
  const measure=appFunction("measurePotential","potentialHtml",["r"],{});
  const eur=(v:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v);
  const potential=appFunction("potentialHtml","wowCard",["r","measurePotential","eur"],{measurePotential:measure,eur});
  const salesOnly={reasons:["Umsatz rückläufig"],g:{shrink:128,writeoff:64}};
  assert(measure(salesOnly).length===0,"Sales-only alert must not inherit unrelated shrink/write-off euro potential");
  assert(potential(salesOnly,measure,eur).includes("Vergleichbarer Vormonatsumsatz fehlt"),"Sales-only advice must name the missing comparison/source data instead of a blanket no-potential statement");
  const shrinkOnly={reasons:["Schwund auffällig"],g:{shrink:128,writeoff:64},dataStatus:{shrinkSourceAvailable:true}};
  const parts=measure(shrinkOnly);
  assert(parts.length===1&&parts[0].label.includes("Schwund reduzieren")&&parts[0].label.includes("Modellannahme 10 %"),"Only the detected shrink signal may contribute");
  assert(Math.abs(parts[0].amount-12.8)<.001,"Shrink scenario must calculate 10% of the monthly shrink amount");
  const combined={reasons:["Schwund auffällig","Abschriften auffällig"],g:{shrink:128,writeoff:64},dataStatus:{shrinkSourceAvailable:true,writeoffSourceAvailable:true}};
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


/** Scenario audit: executes the unchanged production advice functions with synthetic data only. */
function setScenarioGroup(rt:any,key:string,id:string,values:{revenue?:number;margin?:number;shrink?:number;writeoff?:number;stock?:number}) {
  const g=rt.data.months[key].groups[id];
  if(values.revenue!==undefined)g.revenue=values.revenue;
  if(values.margin!==undefined){g.ek=g.revenue*(1-values.margin/100);g._ekEntered=true;}
  if(values.shrink!==undefined)g.shrink=values.shrink;
  if(values.writeoff!==undefined)g.writeoff=values.writeoff;
  if(values.stock!==undefined){g.stock=values.stock;g._stockEntered=true;}
}
function scenarioRow(rt:any,key="2026-10",id="backshop") {
  return rt.wowPriority(key).find((r:any)=>r.g.id===id);
}
Deno.test("scenario audit: rising sales with falling margin flags the margin, not revenue",()=>{
  const rt=runtime(appFixture());
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:55,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1100,margin:50,shrink:2,writeoff:2,stock:440});
  const r=scenarioRow(rt);
  assert(!!r&&r.reasons.some((x:string)=>x.includes("Ist-Marge")),"Margin deterioration was missed");
  assert(!r.reasons.includes("Umsatz rückläufig"),"Rising sales must not be called declining");
});
Deno.test("scenario audit: falling sales with improving margin flags sales only",()=>{
  const rt=runtime(appFixture());
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","backshop",{revenue:900,margin:55,shrink:2,writeoff:2,stock:360});
  const r=scenarioRow(rt);
  assert(!!r&&r.reasons.includes("Umsatz rückläufig"),"Sales decline was missed");
  assert(!r.reasons.some((x:string)=>x.includes("Ist-Marge")),"Improving margin must not be called a margin drop");
});
Deno.test("scenario audit: severe target-margin shortfall without month-on-month deterioration is not triggered",()=>{
  const rt=runtime(appFixture());
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:45,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,margin:45,shrink:2,writeoff:2,stock:400});
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:59.2};
  const r=scenarioRow(rt);
  assert(!!r&&r.reasons.includes("Ist-Marge unter Ihrem Zielwert"),"Stable but below-target margin must independently trigger using the configured category target");
  assert(r.reasons.every((x:string)=>!x.includes("gefallen")),"A stable margin must not be mislabeled as a month-on-month decline");
});
Deno.test("scenario audit: shrink and write-off are independently detected",()=>{
  const rt=runtime(appFixture());
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,margin:50,shrink:20,writeoff:2,stock:400});
  const shrink=scenarioRow(rt);
  assert(!!shrink&&shrink.reasons.includes("Schwund auffällig")&&!shrink.reasons.includes("Abschriften auffällig"),"Shrink-only scenario was not isolated");
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,margin:50,shrink:2,writeoff:8,stock:400});
  const writeoff=scenarioRow(rt);
  assert(!!writeoff&&writeoff.reasons.includes("Abschriften auffällig")&&!writeoff.reasons.includes("Schwund auffällig"),"Write-off-only scenario was not isolated");
});
Deno.test("scenario audit: rising stock ratio triggers at the configured inclusive threshold",()=>{
  const rt=runtime(appFixture());
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:420});
  const atBoundary=scenarioRow(rt);
  assert(!!atBoundary&&atBoundary.reasons.includes("Bestandsquote gestiegen"),"A 5% relative increase must trigger at the inclusive configured threshold");
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:424});
  const above=scenarioRow(rt);
  assert(!!above&&above.reasons.includes("Bestandsquote gestiegen"),"Stock-ratio increase above 5% was missed");
});
Deno.test("scenario audit: seasonal January drop is contextualized against the same month last year",()=>{
  const rt=runtime(appFixture());
  const jan25=rt.data.months["2025-01"].groups.backshop.revenue;
  const dec25=rt.data.months["2025-12"].groups.backshop.revenue;
  setScenarioGroup(rt,"2025-12","backshop",{revenue:dec25,margin:52,shrink:2,writeoff:2,stock:dec25*.4});
  setScenarioGroup(rt,"2026-01","backshop",{revenue:jan25,margin:52,shrink:2,writeoff:2,stock:jan25*.4});
  const r=scenarioRow(rt,"2026-01");
  assert(!r||!r.reasons.includes("Umsatz rückläufig"),"Flat year-on-year January should not be flagged solely because December was higher");
  assert(Math.abs(rt.data.months["2026-01"].groups.backshop.revenue/rt.data.months["2025-01"].groups.backshop.revenue-1)<.001,"January year-on-year must be flat in this scenario");
});
Deno.test("scenario audit: simultaneous signals rank ahead of a single-signal group",()=>{
  const rt=runtime(appFixture());
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:55,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","backshop",{revenue:900,margin:50,shrink:20,writeoff:8,stock:500});
  setScenarioGroup(rt,"2026-09","getraenke",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,"2026-10","getraenke",{revenue:900,margin:50,shrink:2,writeoff:2,stock:400});
  const rows=rt.wowPriority("2026-10");
  assert(rows.length>=2,"Expected two independently flagged groups");
  assert(rows[0].g.id==="backshop","Group with more independent signals should rank ahead of single-signal group");
  assert(rows[0].reasons.length>rows[1].reasons.length,"Priority ordering did not reflect number of reasons");
});

Deno.test("operator settings: revenue, margin, shrink, write-off and stock thresholds are read from the saved configuration",()=>{
  const rt=runtime(appFixture());
  const key="2026-10";
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:50,shrink:4,writeoff:4,stock:400});
  setScenarioGroup(rt,key,"backshop",{revenue:960,margin:49,shrink:6,writeoff:6,stock:403.2});
  // The same synthetic data is evaluated against two deliberately different operator profiles.
  rt.data.settings={...rt.data.settings,revenueDrop:3,marginDrop:.8,shrinkRate:.5,writeoffRate:.5,stockIncrease:4};
  const permissive=rt.wowPriority(key).find((r:any)=>r.g.id==="backshop");
  assert(!!permissive,"Lower configured limits should produce a review row");
  assert(permissive.reasons.includes("Umsatz rückläufig"),"Configured 3% revenue threshold was ignored");
  assert(permissive.reasons.some((x:string)=>x.includes("Ist-Marge")),"Configured 0.8 percentage-point margin threshold was ignored");
  assert(permissive.reasons.includes("Schwund auffällig"),"Configured shrink threshold was ignored");
  assert(permissive.reasons.includes("Abschriften auffällig"),"Configured write-off threshold was ignored");
  assert(permissive.reasons.includes("Bestandsquote gestiegen"),"Configured 4% relative stock threshold was ignored");

  rt.data.settings={...rt.data.settings,revenueDrop:5,marginDrop:1.5,shrinkRate:1,writeoffRate:1,stockIncrease:6};
  const stricter=rt.wowPriority(key).find((r:any)=>r.g.id==="backshop");
  assert(!stricter||!stricter.reasons.includes("Umsatz rückläufig"),"Revenue signal ignored the stricter 5% operator threshold");
  assert(!stricter||!stricter.reasons.some((x:string)=>x.includes("Ist-Marge")),"Margin signal ignored the stricter 1.5 point operator threshold");
  assert(!stricter||!stricter.reasons.includes("Schwund auffällig"),"Shrink signal ignored the stricter 1% operator threshold");
  assert(!stricter||!stricter.reasons.includes("Abschriften auffällig"),"Write-off signal ignored the stricter 1% operator threshold");
  assert(!stricter||!stricter.reasons.includes("Bestandsquote gestiegen"),"Stock signal ignored the stricter 6% operator threshold");
});

Deno.test("operator settings: per-category target margins flow into the real calculation without universal target assumptions",()=>{
  const rt=runtime(appFixture());
  const key="2026-10";
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:43.7,kaffee:67.3,getraenke:38.4};
  const d=rt.calc(key);
  const target=(id:string)=>d.groups.find((g:any)=>g.id===id)?.margin;
  assert(target("backshop")===43.7,"Backshop must use the operator-entered 43.7% target");
  assert(target("kaffee")===67.3,"Coffee must use the operator-entered 67.3% target");
  assert(target("getraenke")===38.4,"Drinks must use the operator-entered 38.4% target");
  assert(target("drogerie")===50,"Unchanged category must retain its own configured/default value, not inherit another category's target");
  rt.data.settings.targetMargins.backshop=61.1;
  assert(rt.calc(key).groups.find((g:any)=>g.id==="backshop")?.margin===61.1,"Changing the operator target must immediately change the calculated target field");
});

Deno.test("operator settings: threshold boundary behavior follows each entered value, not test fixture defaults",()=>{
  const rt=runtime(appFixture());
  const key="2026-10";
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:50,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,key,"backshop",{revenue:970,margin:48.5,shrink:10.67,writeoff:10.67,stock:407.4});
  rt.data.settings={...rt.data.settings,revenueDrop:3,marginDrop:1.5,shrinkRate:1,writeoffRate:1,stockIncrease:5};
  const at=rt.wowPriority(key).find((r:any)=>r.g.id==="backshop");
  assert(!!at,"Signals exactly at configured boundaries must be retained");
  assert(at.reasons.includes("Umsatz rückläufig"),"Revenue decline exactly at the entered 3% boundary must trigger");
  assert(at.reasons.some((x:string)=>x.includes("Ist-Marge")),"Margin drop exactly at the entered 1.5 point boundary must trigger");
  assert(at.reasons.includes("Schwund auffällig")&&at.reasons.includes("Abschriften auffällig"),"Rates above their entered 1% boundaries must trigger");
  assert(at.reasons.includes("Bestandsquote gestiegen"),"Stock ratio increase exactly at the entered 5% relative boundary must trigger");
});


Deno.test("operator target margins are evaluated independently for each category",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:52.4,kaffee:47.3,getraenke:39.6};
  for(const k of ["2026-09",key]) for(const id of ["backshop","kaffee","getraenke"]) setScenarioGroup(rt,k,id,{revenue:1000,margin:46,shrink:0,writeoff:0,stock:400});
  const rows=rt.wowPriority(key);
  assert(rows.some((r:any)=>r.g.id==="backshop"&&r.reasons.includes("Ist-Marge unter Ihrem Zielwert")),"52.4% operator target must flag actual 46%");
  assert(rows.some((r:any)=>r.g.id==="kaffee"&&r.reasons.includes("Ist-Marge unter Ihrem Zielwert")),"47.3% operator target must flag actual 46%");
  assert(!rows.some((r:any)=>r.g.id==="getraenke"&&r.reasons.includes("Ist-Marge unter Ihrem Zielwert")),"39.6% operator target must not flag actual 46%");
});
Deno.test("target-margin trigger follows a changed target and requires entered EK",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:45.7};
  for(const k of ["2026-09",key]) setScenarioGroup(rt,k,"backshop",{revenue:1000,margin:46,shrink:0,writeoff:0,stock:400});
  assert(!scenarioRow(rt,key,"backshop")?.reasons.includes("Ist-Marge unter Ihrem Zielwert"),"Actual 46% meets target 45.7%");
  rt.data.settings.targetMargins.backshop=46.8;
  assert(scenarioRow(rt,key,"backshop")?.reasons.includes("Ist-Marge unter Ihrem Zielwert"),"Target change to 46.8% must trigger against actual 46%");
  rt.data.months[key].groups.backshop._ekEntered=false;
  assert(!scenarioRow(rt,key,"backshop")?.reasons.includes("Ist-Marge unter Ihrem Zielwert"),"Missing EK must not fabricate a target shortfall");
});
Deno.test("same-month prior-year comparison contextualizes a seasonal sales drop",()=>{
  const rt=runtime(appFixture());
  const jan25=rt.data.months["2025-01"].groups.backshop.revenue;
  setScenarioGroup(rt,"2025-12","backshop",{revenue:jan25*1.4,margin:52,shrink:0,writeoff:0,stock:jan25*.56});
  setScenarioGroup(rt,"2026-01","backshop",{revenue:jan25,margin:52,shrink:0,writeoff:0,stock:jan25*.4});
  const r=scenarioRow(rt,"2026-01");
  assert(!r||!r.reasons.includes("Umsatz rückläufig"),"Flat year-on-year January must not be treated as unexplained seasonal decline");
});
Deno.test("seasonal context retains real year-on-year decline and independent operational alerts",()=>{
  const rt=runtime(appFixture());
  const jan25=rt.data.months["2025-01"].groups.backshop.revenue;
  setScenarioGroup(rt,"2025-12","backshop",{revenue:25000,margin:52,shrink:0,writeoff:0,stock:10000});
  setScenarioGroup(rt,"2026-01","backshop",{revenue:jan25*.8,margin:48,shrink:200,writeoff:0,stock:jan25*.32});
  const r=scenarioRow(rt,"2026-01");
  assert(!!r&&r.reasons.includes("Umsatz rückläufig"),"Material year-on-year decline must remain visible");
  assert(r.reasons.some((x:string)=>x.includes("Ist-Marge")),"Seasonality must not suppress independent margin deterioration");
  assert(r.reasons.includes("Schwund auffällig"),"Seasonality must not suppress independent shrink alerts");
});
Deno.test("missing prior-year same-month data does not suppress month-on-month sales review",()=>{
  const rt=runtime(appFixture());
  delete rt.data.months["2025-01"];
  setScenarioGroup(rt,"2025-12","backshop",{revenue:25000,margin:52,shrink:0,writeoff:0,stock:10000});
  setScenarioGroup(rt,"2026-01","backshop",{revenue:1000,margin:52,shrink:0,writeoff:0,stock:400});
  const r=scenarioRow(rt,"2026-01");
  assert(!!r&&r.reasons.includes("Umsatz rückläufig"),"Without prior-year same-month data, configured month-on-month logic remains active");
});


Deno.test("report renders every signal, separates actual and target margin, and never fabricates missing inventory",()=>{
  const rt=runtime(appFixture());
  const key="2026-10";
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:52,shrink:2,writeoff:2,stock:400});
  setScenarioGroup(rt,key,"backshop",{revenue:900,margin:48,shrink:20,writeoff:8,stock:0});
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:50};
  rt.data.months[key].sourceInventory=false;
  rt.data.months[key].sourceShrink=true;
  rt.data.months[key].sourceEK=false;
  rt.report();
  const out=rt.target.innerHTML;
  for(const signal of ["Umsatz rückläufig","Ist-Marge unter Ihrem Zielwert","Schwund auffällig","Abschriften auffällig"])
    assert(out.includes(signal),"Report omitted independent signal: "+signal);
  assert(out.includes("Ist-Marge 48,0 % · Zielmarge 50,0 %"),"Report must show actual and operator target margin separately");
  assert(out.includes("Bestandsquote")&&out.includes("Nicht erfasst"),"Missing inventory must be labeled as unavailable, not 0%");
  assert(out.includes("Rohertrag")&&out.includes("Nicht erfasst"),"Missing shop EK source must not produce a fabricated gross profit");
  assert(out.includes("Shop-Ist-Marge")&&out.includes("Nicht berechenbar"),"Missing shop EK source must not show a fabricated 100% margin");
  assert(!out.includes("kein festgestellter Verlust"),"Report must not negate its own loss-related review signals");
  assert(out.includes("Prüfsignal, kein bestätigter Verlustnachweis"),"Report must distinguish a review signal from proven loss");
  assert((out.match(/class="report-guidance-step"/g)||[]).length===4,"The report must keep all four advisory stages available as expandable sections");
  assert(out.includes("Pfand und Gebindegrößen")&&out.includes("Produktionsmengen"),"Expanded guidance must retain category-specific drinks and bakery checks");
  assert(out.includes("Wirkung mit derselben Datengrundlage kontrollieren"),"Expanded guidance must retain a substantive follow-up control step");
});
Deno.test("missing shrink source suppresses shrink signals, risk and euro potential even if stale amounts remain",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  rt.data.months[key].sourceShrink=false;
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,shrink:80,writeoff:60});
  const row=scenarioRow(rt,key,"backshop");
  assert(!row||(!row.reasons.includes("Schwund auffällig")&&!row.reasons.includes("Abschriften auffällig")),"Unconfirmed shrink data must not create operational alerts");
  if(row){const measure=appFunction("measurePotential","potentialHtml",["r"],{});assert(measure({...row,reasons:["Schwund auffällig","Abschriften auffällig"]}).length===0,"Unconfirmed shrink data must not create euro potential");}
});

Deno.test("report shows inventory ratios only when inventory source is confirmed",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  rt.data.months[key].sourceInventory=true;
  rt.report();
  assert(!rt.target.innerHTML.includes("Bestandsquote</div><div class=\"value\">Nicht erfasst"),"Confirmed inventory source should allow a measured overall ratio");
});

Deno.test("missing inventory source suppresses stock signals and never leaks stored group stock into report guidance",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:48,shrink:0,writeoff:0,stock:400});
  setScenarioGroup(rt,key,"backshop",{revenue:1000,margin:47,shrink:0,writeoff:0,stock:6800});
  rt.data.months["2026-09"].sourceInventory=true;
  rt.data.months[key].sourceInventory=false;
  rt.data.months[key].sourceShrink=true;
  const row=scenarioRow(rt,key,"backshop");
  assert(!!row&&row.stockRatio===null,`Unconfirmed inventory must not produce a stock ratio; row=${JSON.stringify(row&&{stockRatio:row.stockRatio,inventorySourceAvailable:row.dataStatus?.inventorySourceAvailable,groupStockEntered:row.g?.stockEntered})}`);
  assert(!row.reasons.includes("Bestandsquote gestiegen"),"Unconfirmed inventory must not create a stock-trend alert");
  rt.report();
  const out=rt.target.innerHTML;
  assert(out.includes("Lagerbestand nicht erfasst"),"Priority guidance must explicitly mark missing inventory");
  assert(!out.includes("Lagerbestand 6.800"),"Stored but unconfirmed stock must not be presented as a measured value");
});
Deno.test("risk score incorporates an operator target-margin miss",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  setScenarioGroup(rt,key,"backshop",{revenue:1000,margin:40,shrink:0,writeoff:0,stock:400});
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:60};
  const row=scenarioRow(rt,key);
  assert(!!row&&row.targetMarginGap===20,"Configured target gap must be present in the real priority row");
  const risk=rt.riskForRow(row);
  assert(risk.key!=="normal","Target-margin miss must affect review risk");
});
Deno.test("revenue scenario uses actual margin and refuses to invent profit when EK is missing",()=>{
  const rt=runtime(appFixture());
  const g=rt.calc("2026-10").groups.find((x:any)=>x.id==="backshop");
  g.revenue=1000;g.actualMargin=42;g.margin=60;
  const measured=rt.scenarioResult(g,10,0,0);
  assert(Math.abs((measured.revenueGain||0)-42)<.001,"Revenue uplift must use 42% actual margin, not 60% target margin");
  g.actualMargin=null;
  const missing=rt.scenarioResult(g,10,0,0);
  assert(missing.revenueGain===null,"Missing actual margin must not produce a revenue-profit estimate");
  assert(missing.total===0,"Unmeasured revenue profit must not be included in calculated potential");
});


Deno.test("economic potential calculates traceable euro scenarios from confirmed sales, margin and shrink sources",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:40,shrink:0,writeoff:0,stock:400});
  setScenarioGroup(rt,key,"backshop",{revenue:800,margin:40,shrink:100,writeoff:50,stock:400});
  rt.data.months[key].sourceMonthly=true;
  rt.data.months[key].sourceShrink=true;
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:50};
  const row=scenarioRow(rt,key,"backshop");
  assert(!!row,"Expected an economic review row");
  const measure=appFunction("measurePotential","potentialHtml",["r"],{});
  const parts=measure(row);
  const total=parts.reduce((sum:any,p:any)=>sum+p.amount,0);
  assert(Math.abs(total-35)<.001,"Expected €20 shared gross-profit scenario (not €40 double-counted) + €10 shrink + €5 write-off scenario");
  assert(parts.length===3&&parts[0].kind==="zusätzlicher Rohertrag","Margin and sales effects must be combined into one non-overlapping gross-profit scenario");
  assert(Math.abs(parts[0].marginScenario-20)<.001&&Math.abs(parts[0].salesScenario-20)<.001,"Both individual scenario values must remain visible for transparency");
});

Deno.test("economic potential never monetizes unconfirmed EK, monthly sales or inventory-only signals",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  setScenarioGroup(rt,"2026-09","backshop",{revenue:1000,margin:40,shrink:0,writeoff:0,stock:400});
  setScenarioGroup(rt,key,"backshop",{revenue:800,margin:40,shrink:0,writeoff:0,stock:700});
  rt.data.months[key].sourceMonthly=false;
  rt.data.months[key].sourceInventory=true;
  rt.data.settings.targetMargins={...rt.data.settings.targetMargins,backshop:50};
  const row=scenarioRow(rt,key,"backshop");
  assert(!!row,"Expected a review row for the target-margin gap");
  rt.data.months[key].groups.backshop._ekEntered=false;
  const refreshed=scenarioRow(rt,key,"backshop");
  const measure=appFunction("measurePotential","potentialHtml",["r"],{});
  assert(measure(refreshed).length===0,"Missing EK and unconfirmed monthly source must not produce a euro amount");
});


Deno.test("inventory metrics calculate only calendar-day stock coverage",()=>{
  const metric=appFunction("inventoryMetrics","reconciliation",["g","days"],{});
  const m=metric({stock:1200,stockEntered:true,ek:3000,ekEntered:true,openingStock:1000,openingStockEntered:true,targetStockDays:10},30);
  assert(m.available,"Confirmed inventory should be available");
  assert(Math.abs(m.coverageDays-12)<.001,"Expected 12 days stock coverage");
  assert(m.monthlyTurnover===null&&m.targetStock===null&&m.excessCapital===null,"Opening stock and manually configured targets must not affect the simplified analysis");
  const missing=metric({stock:1200,stockEntered:false,ek:3000,ekEntered:true},30);
  assert(!missing.available&&missing.coverageDays===null,"Unconfirmed inventory must not create a coverage estimate");
  const optionalOpening=metric({stock:1200,stockEntered:true,ek:3000,ekEntered:true,openingStock:null,openingStockEntered:false},30);
  assert(optionalOpening.available&&Math.abs(optionalOpening.coverageDays-12)<.001&&optionalOpening.monthlyTurnover===null,"Coverage must work without opening stock");
});

Deno.test("inventory analysis uses actual calendar days and reconciles documented stock movements",()=>{
  const days=appFunction("inventoryPeriodDays","inventoryMetrics",["key"],{});
  assert(days("2026-02")===28&&days("2024-02")===29&&days("2026-09")===30&&days("2026-10")===31,"Inventory rate calculations must use the selected calendar month's actual day count");
  const balance=appFunction("inventoryMovementBalance","reconciliation",["g"],{});
  const complete={openingStock:1000,openingStockEntered:true,stockPurchasesEK:500,stockPurchasesEntered:true,supplierReturnsEK:50,supplierReturnsEntered:true,stockLossesEK:20,stockLossesEntered:true,stockAdjustmentsEK:10,stockAdjustmentsEntered:true,ek:400,ekEntered:true,stock:1040,stockEntered:true};
  const m=balance(complete);
  assert(m.ready&&Math.abs(m.expectedClosing-1040)<.001&&Math.abs(m.difference)<.001,"Expected a reconciled closing stock of 1,040 EUR");
  const discrepancy=balance({...complete,stock:1000});
  assert(discrepancy.ready&&Math.abs(discrepancy.difference-40)<.001,"A 40 EUR difference must remain visible for review");
  const missing=balance({...complete,stockLossesEntered:false});
  assert(!missing.ready&&missing.difference===null,"Missing movement values must not be treated as zero");
  const negative=balance({...complete,supplierReturnsEK:-1});
  assert(!negative.ready,"Negative supplier returns must be rejected");
});

Deno.test("stock coverage is integrated into merchandise-group inputs without requiring opening stock",()=>{
  assert(html.includes("data-stock="),"Current end stock must be entered directly with the merchandise group");
  assert(!html.includes('id="openingStock"')&&!html.includes('id="purchasesEK"')&&!html.includes('id="stock"'),"Obsolete global opening/closing stock and purchase inputs must not be shown");
  assert(!html.includes("<input data-opening-stock")&&!html.includes("<input data-target-stock-days")&&!html.includes("<input data-operational-min-stock"),"Optional turnover and target-stock fields must not be shown");
  assert(html.includes("Reichweite je Warengruppe")&&html.includes("coverageDays"),"The existing report table must show stock coverage");
  assert(html.includes("inventoryPeriodDays(k)")&&html.includes("days=Number(g?.periodDays)||days"),"Coverage must use the actual calendar days of the selected month");
});

Deno.test("category advice uses distinct operational checks for drinks, coffee and bakery",()=>{
  const rt=runtime(appFixture());
  const guidance=(id:string)=>rt.practiceGuidance({g:{id,name:id},reasons:["Ist-Marge unter Ihrem Zielwert"],dataStatus:{groupEkAvailable:true,previousMonthAvailable:true}});
  const drinks=guidance("getraenke"),coffee=guidance("kaffee"),bakery=guidance("backshop");
  assert(drinks.includes("Pfand")&&drinks.includes("Gebindegrößen"),"Drinks advice must cover deposit and pack sizes");
  assert(coffee.includes("Rezepturen")&&coffee.includes("Bohnenmenge")&&!coffee.includes("Pfand"),"Coffee advice must focus on recipe-level cup contribution, not generic deposit checks");
  assert(bakery.includes("Backintervalle")&&bakery.includes("Tageszeit-Abverkauf"),"Bakery advice must focus on production timing and daypart sales");
});

Deno.test("priority tie-break uses economic exposure after signal strength",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  for(const id of ["backshop","getraenke"]) {
    setScenarioGroup(rt,"2026-09",id,{revenue:1000,margin:50,shrink:0,writeoff:0,stock:400});
    setScenarioGroup(rt,key,id,{revenue:1000,margin:45,shrink:0,writeoff:0,stock:400});
  }
  setScenarioGroup(rt,"2026-10","backshop",{revenue:1000,margin:45,shrink:0,writeoff:0,stock:400});
  setScenarioGroup(rt,"2026-10","getraenke",{revenue:10000,margin:45,shrink:0,writeoff:0,stock:4000});
  const rows=rt.wowPriority(key);
  const b=rows.find((r:any)=>r.g.id==="backshop"),d=rows.find((r:any)=>r.g.id==="getraenke");
  assert(!!b&&!!d&&b.signalScore===d.signalScore,"Fixture must create equal signal strength");
  assert(d.economicExposure>b.economicExposure&&rows.indexOf(d)<rows.indexOf(b),"Higher euro exposure must rank first when signal strength is equal");
});

Deno.test("legacy opening-stock and target fields are ignored by the simplified coverage calculation",()=>{
  const metric=appFunction("inventoryMetrics","inventoryMovementBalance",["g","days"],{});
  const result=metric({stock:4050,stockEntered:true,ek:2800,ekEntered:true,openingStock:4000,openingStockEntered:true,targetStockDays:30,operationalMinStockEntered:true,operationalMinStockEK:3200,periodDays:31},31);
  assert(Math.abs(result.coverageDays-(4050/(2800/31)))<.001,"Coverage must use current stock and actual month length only");
  assert(result.monthlyTurnover===null&&result.excessCapital===null&&result.avoidableExcessCapital===null,"Legacy values must not reactivate inventory-management metrics");
});

Deno.test("data quality treats possible negative gross margin and high shrink as review hints, not hard errors",()=>{
  const rt=runtime(appFixture()),key="2026-10",m=rt.data.months[key];
  m.revenue=1000;m.ek=1200;m.shrink=1400;
  m.groups.backshop.revenue=100;m.groups.backshop.shrink=150;
  const q=rt.dataQuality(key);
  assert(q.errors.length===0,"Economically possible negative gross margin / high shrink must not be classified as hard data errors");
  assert(q.status==="check","Plausibility anomalies should create a single review state");
  assert(q.notes.some((x:string)=>x.includes("negativer Rohertrag")),"Negative gross margin needs a contextual review hint");
  assert(q.notes.some((x:string)=>x.includes("Schwund liegt über dem Shop-Umsatz")),"High total shrink needs a contextual review hint");
  assert(q.notes.some((x:string)=>x.includes("Backwaren")||x.includes("Backshop")),"High group shrink needs a contextual review hint");
});
Deno.test("seasonal event learning normalizes revenue by actual calendar days",()=>{
  const learn=appFunction("learnCalendarEffects","forecastSeason",["months","calFn","calcFn","station"],{station:{city:"Testort"}});
  const result=learn(["2025-02","2024-02"],()=>({holidays:[{name:"Nikolaus"}],upcoming:[]}),(k:string)=>({revenue:k==="2025-02"?2800:2900}));
  assert(result.length===1&&result[0].observations===2,"Two observed event months should be retained");
  assert(Math.abs(result[0].avgDailyRevenue-100)<.001,"Leap-year February and standard February must be compared on daily revenue, not raw monthly totals");
  assert(result[0].method==="Umsatz je Kalendertag","Seasonal method must be explicitly identified");
});
Deno.test("potential display labels 25% and 10% rates as assumptions, not evidence",()=>{
  assert(html.includes("Modellannahme 25 %")&&html.includes("Modellannahme 10 %"),"Scenario rates must be visibly labeled as model assumptions");
  assert(html.includes("keine empirisch belegten Erfolgsquoten"),"Potential disclaimer must say the rates are not empirically established success rates");
});
Deno.test("knowledge article SEO keywords never contain undefined",async()=>{
  const articlePaths=["wissen/backshop-tankstelle.html","wissen/marge-tankstellenshop.html","wissen/rohertrag-tankstellenshop.html","wissen/sortiment-tankstellenshop.html","wissen/warenwirtschaft-tankstelle.html"];
  for(const path of articlePaths){const content=await Deno.readTextFile(new URL("./"+path,import.meta.url));assert(!/name="keywords" content="undefined"/i.test(content),path+" still has undefined SEO keywords");}
});

Deno.test("annual overview never treats missing EK as zero-cost gross profit",()=>{
  const data=appFixture();
  data.months["2025-01"].sourceEK=false;
  const rt=runtime(data);
  rt.yearly();
  assert(rt.target.innerHTML.includes("EK fehlt"),"Month without confirmed EK must be marked not calculable");
  assert(rt.target.innerHTML.includes("EK-Teilbasis"),"Annual margin must disclose partial EK coverage");
  assert(rt.target.innerHTML.includes("nur 11/12 Umsatzmonate mit EK"),"Annual gross profit must disclose the months included in its partial base");
});
Deno.test("loss reconciliation requires explicit shrink and write-off entries",()=>{
  const data=appFixture();
  const key="2026-10",row=data.months[key];
  row.openingStock=4000;row.purchasesEK=3000;row.stock=4000;row.ek=2800;
  row.inventoryClosingEntered=true;row.inventoryEkEntered=true;
  const reconcile=appFunction("reconciliation","renderTurnoverCheck",["month","mrow"],{month:()=>key,mrow:(k:string)=>data.months[k]});
  assert(reconcile(key).ready===false,"Missing shrink/write-off values must not be silently treated as zero");
  row.shrinkEntered=true;row.writeoffEntered=true;
  assert(reconcile(key).ready===true,"Reconciliation should become available once all required inputs are explicit");
});
Deno.test("simulation does not turn missing shrink/write-off data into zero savings",()=>{
  const rt=runtime(appFixture());
  const group={revenue:1000,actualMargin:40,shrink:80,writeoff:20};
  const result=rt.scenarioResult(group,5,10,10,false);
  assert(result.shrinkGain===null&&result.writeoffGain===null,"Unrecorded loss sources must remain unavailable in simulation");
  assert(Math.abs(result.total-20)<.001,"Only the calculable revenue-margin component may contribute to the scenario total");
});
Deno.test("dashboard and quick advisory never display gross profit or margin without confirmed EK",()=>{
  assert(html.includes("Nicht berechenbar · EK fehlt"),"Dashboard must label missing EK");
  assert(html.includes("d.sourceEK&&d.revenue>0?pct(d.margin):'Nicht berechenbar'"),"Dashboard must guard margin without EK");
  assert(html.includes("valid=g.revenueEntered===true&&g.revenue>0&&g.ekEntered===true&&g.ek>0"),"Drink advice must require confirmed positive group EK before calculating actual margin");
  assert(html.includes("valid?g.actualMargin.toLocaleString('de-DE',{maximumFractionDigits:1})+' %':'nicht berechenbar'"),"Drink advice must display calculated actual group margin, not configured target margin");
  assert(html.includes("d.sourceMonthly&&d.sourceEK?money(d.gross):'nicht berechenbar · bestätigter Umsatz/EK fehlt'"),"Quick advice must not present gross profit without confirmed monthly revenue and EK");
});
Deno.test("monthly stock reconciliation input requires loss data to be entered explicitly",()=>{
  assert(html.includes("r.shrinkEntered=$('shrink').value!=='';r.writeoffEntered=$('writeoff').value!==''"),"Monthly input must preserve explicit empty-vs-zero loss fields");
  assert(html.includes("x.shrinkEntered!==true||x.writeoffEntered!==true"),"Reconciliation must gate on explicit loss inputs");
});

Deno.test("manual month entry marks data sources and data quality emits one consolidated hint",()=>{
  const data=appFixture(),key="2026-10",row=data.months[key];
  row.sourceMonthly=true;row.sourceEK=true;row.sourceShrink=true;
  row.revenue=1000;row.ek=1200;row.shrink=1400;
  row.groups.backshop._revenueEntered=true;row.groups.backshop.revenue=100;row.groups.backshop.shrink=150;
  const q=runtime(data).dataQuality(key);
  assert(q.errors.length===0,"Possible negative gross margin and high shrink must not be hard errors");
  assert(q.notes.length===1,"Multiple plausibility anomalies should be consolidated into one review hint");
  assert(q.notes[0].includes("negativer Rohertrag")&&q.notes[0].includes("Schwund bei Backwaren"),"Consolidated hint must retain the relevant checks");
});

Deno.test("simulation shows not calculable when neither margin nor loss sources are available",()=>{
  const rt=runtime(appFixture());
  const result=rt.scenarioResult({revenue:1000,actualMargin:null,shrink:0,writeoff:0},5,10,10,false);
  assert(result.total===null,"No available calculation component must not be shown as zero potential");
});
Deno.test("monthly overview displays the consolidated quality hint and guards margin comparisons",()=>{
  assert(html.includes("const qualityTone=dq.status")&&html.includes("dq.findings.map(f=>"),"Monthly overview must show the consolidated, expandable data-quality check");
  assert(html.includes("d.sourceEK===true&&p.sourceEK===true&&d.revenue>0&&p.revenue>0"),"Monthly margin comparison must require confirmed EK in both periods");
  assert(html.includes("d.sourceShrink===true&&d.revenue>0"),"Monthly shrink comparison must require a confirmed shrink source");
});

Deno.test("analysis view never reports missing EK or shrink as zero and gates month comparisons",()=>{
  const analysis=html.slice(html.indexOf("function analysis()"),html.indexOf("function renderCustomScenarioInputs"));
  assert(analysis.includes("d.sourceEK?eur(d.ek):'Nicht erfasst'"),"Analysis must mark missing EK");
  assert(analysis.includes("d.sourceMonthly&&d.sourceEK?eur(d.gross):'Nicht berechenbar · Umsatz/EK fehlt'"),"Analysis must not present false gross profit");
  assert(analysis.includes("d.sourceShrink&&g.shrinkEntered===true?eur(g.shrink):'Nicht erfasst'"),"Analysis must not show missing group shrink as zero");
  assert(analysis.includes("d.sourceMonthly&&p.sourceMonthly"),"Revenue comparison must require both source months");
  assert(analysis.includes("d.sourceMonthly&&p.sourceMonthly&&d.sourceEK&&p.sourceEK&&d.revenue>0&&p.revenue>0"),"Margin comparison must require confirmed EK and positive sales in both months");
});

Deno.test("advisor chat does not rank groups or calculate shop totals when EK is missing",()=>{
  const start=html.indexOf("function advisorReplyBase"),end=html.indexOf("function advisorReply(",start),advisor=html.slice(start,end);
  assert(advisor.includes("d.sourceEK?money(d.ek):'nicht erfasst'"),"Advisor must not show missing EK as zero");
  assert(advisor.includes("d.sourceEK?money(d.gross):'nicht berechenbar · bestätigter EK fehlt'"),"Advisor must not calculate gross profit without EK");
  assert(advisor.includes("d.sourceEK===true?d.groups.filter"),"Advisor must not rank groups by gross profit if EK is missing");
  assert(advisor.includes("lossAvailable=d.sourceShrink===true"),"Loss advice must gate totals on confirmed loss data");
  assert(advisor.includes("comparisonAvailable=lossAvailable&&p?.sourceShrink===true"),"Loss comparisons must require both source periods");
});

Deno.test("report does not aggregate a partially confirmed inventory as a complete station stock",()=>{
  const rt=runtime(appFixture()),key="2026-10";
  rt.data.months[key].sourceInventory=true;
  rt.data.months[key].groups.getraenke._stockEntered=false;
  rt.report();
  const out=rt.target.innerHTML;
  assert(out.includes("Teilbestand · nicht vollständig"),"A partial inventory source must not be presented as a complete station total");
  assert(out.includes("Bestand dieser Warengruppe nicht bestätigt"),"A group without a confirmed stock count must remain explicitly unconfirmed");
  assert(out.includes("Lagerbestand EK</th>"),"The inventory detail table must remain available");
});

Deno.test("radar and advisor never surface stale shrink values when the source is unconfirmed",()=>{
  const radarStart=html.indexOf("function radar()"),radarEnd=html.indexOf("function startRadarAction",radarStart);
  const radar=html.slice(radarStart,radarEnd);
  assert(radar.includes("r.dataStatus?.shrinkSourceAvailable?eur(r.g.shrink):'Nicht erfasst'"),"Radar must gate shrink amounts on a confirmed source");
  assert(radar.includes("r.dataStatus?.writeoffSourceAvailable?eur(r.g.writeoff):'nicht zugeordnet'"),"Radar must gate write-off amounts on a confirmed source and label unallocated values");
  const start=html.indexOf("function advisorReplyBase"),end=html.indexOf("function advisorReply(",start),advisor=html.slice(start,end);
  assert(advisor.includes("lossAvailable&&d.groups&&d.groups.some"),"Advisor group-level loss statements must be gated on the confirmed loss source");
});

Deno.test("customer-facing advisor answers contain no test-only wording",()=>{
  const start=html.indexOf("function advisorDirectAnswer"),end=html.indexOf("function advisorReplyBase",start);
  const direct=html.slice(start,end);
  assert(!/aktuellen Test|Testzustand|Testdaten/i.test(direct),"Test-only wording must not appear in customer-facing direct answers");
});


function twoYearAdvisorTestAccount() {
  const data = appFixture();
  data.testAccount = {name:"TSE Zwei-Jahres-Beratungstest", kind:"synthetic", years:["2025","2026"], months:24, asOfMonth:"2026-10"};
  const key = "2026-10";
  const marginByGroup: Record<string,number> = {
    backshop:30,spielzeug:35,getraenke:40,lebensmittel:45,drogerie:50,
    "süsswaren":59,eis:60,kaffee:65,waschen:0
  };
  for (const [id,margin] of Object.entries(marginByGroup)) {
    const g = data.months[key].groups[id];
    if (!g || id === "waschen") continue;
    g.ek = g.revenue * (1 - margin / 100);
    g._ekEntered = true;
  }
  return data;
}

function advisorTestReply(data:any, key="2026-12") {
  const rt = runtime(data);
  const month = () => key;
  const advisorNorm = appFunction("advisorNorm","advisorScopeGuard",[],{});
  const reconciliation = () => ({ready:false});
  const dataQuality = () => ({notes:[]});
  const settings = () => data.settings || {};
  const inventoryPeriodDays = appFunction("inventoryPeriodDays","inventoryMetrics",["key"],{});
  const eur = (v:number) => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(Number(v)||0);
  const eurExact = (v:number) => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  const measurePotential = appFunction("measurePotential","potentialHtml",[],{});
  const potentialHtml = appFunction("potentialHtml","scenarioOptions",["measurePotential","eur","eurExact"],{measurePotential,eur,eurExact});
  const advisorDirectAnswer = appFunction("advisorDirectAnswer","advisorHasCurrentMonthData",
    ["advisorNorm","month","calc","data"],{advisorNorm,month,calc:rt.calc,data});
  const advisorEvidenceResponse = appFunction("advisorEvidenceResponse","advisorReply",[],{});
  const advisorReplyBase = appFunction("advisorReplyBase","advisorEvidenceResponse",
    ["advisorNorm","month","calc","prev","data","reconciliation","dataQuality","settings","GROUPS","inventoryMetrics","inventoryPeriodDays","wowPriority","potentialHtml"],
    {advisorNorm,month,calc:rt.calc,prev:rt.prev,data,reconciliation,dataQuality,settings,GROUPS:groupDefs,inventoryMetrics:rt.inventoryMetrics,inventoryPeriodDays,wowPriority:rt.wowPriority,potentialHtml});
  const advisorGeneralGuidanceAnswer = appFunction("advisorGeneralGuidanceAnswer","advisorReplyBase",["advisorNorm"],{advisorNorm});
  return appFunction("advisorReply","initAdvisorChat",
    ["advisorScopeGuard","advisorNorm","advisorDirectAnswer","advisorGeneralGuidanceAnswer","advisorNoDataAnswer","advisorHasCurrentMonthData","advisorReplyBase","advisorKnowledgeHtml","advisorEvidenceResponse"],
    {advisorScopeGuard:()=>"",advisorNorm,advisorDirectAnswer,advisorGeneralGuidanceAnswer,
      advisorNoDataAnswer:()=>"",advisorHasCurrentMonthData:()=>true,advisorReplyBase,advisorKnowledgeHtml:() => "",advisorEvidenceResponse});
}

Deno.test("two-year synthetic advisory account ranks real confirmed margins instead of returning a stale no-data answer",()=>{
  const data=twoYearAdvisorTestAccount();
  assert(Object.keys(data.months).length===24,"Test account must contain 24 monthly records");
  assert(data.testAccount.years.join(",")==="2025,2026","Test account must cover 2025 and 2026");
  const reply=advisorTestReply(data,"2026-10");
  const weakest=reply("Welche Warengruppe hat die niedrigste Marge?");
  assert(!weakest.includes("Für die aktuell geladenen Stationsdaten liegen keine bestätigten Werte"),"Advisor must not claim missing data when confirmed group EK values exist");
  assert(weakest.indexOf("<li><b>Backwaren")>=0&&weakest.indexOf("<li><b>Backwaren")<weakest.indexOf("<li><b>Spielzeug"),"Weakest margin must rank Backwaren (30%) before Spielzeug (35%). Actual answer: "+weakest);
  const strongest=reply("Welche Warengruppe hat die höchste Marge?");
  assert(strongest.indexOf("<li><b>Kaffee")>=0&&strongest.indexOf("<li><b>Kaffee")<strongest.indexOf("<li><b>Eis"),"Highest margin must rank Kaffee (65%) before Eis (60%). Actual answer: "+strongest);
});

Deno.test("two-year advisory account reports real year-over-year loss values and labels causes as unproven",()=>{
  const data=twoYearAdvisorTestAccount();
  const reply=advisorTestReply(data,"2026-10");
  const answer=reply("Wie entwickeln sich meine erfassten Verlustbeträge im Vergleich zum Vorjahr?");
  assert(answer.includes("Vorjahresmonat (2025-10)"),"Loss advice must compare the same calendar month in the previous year. Actual answer: "+answer);
  assert(answer.includes("Erfasster Schwund")&&answer.includes("Abschriften"),"Loss advice must separate recorded shrink and write-offs");
  assert(answer.includes("1.338,48")&&answer.includes("990,00")&&answer.includes("348,48"),"Loss advice must calculate current, prior-year and delta values from the same month");
  assert(!answer.includes("<li>Waschen:"),"Non-shop wash service must not appear in shop group loss breakdown");
  assert(answer.includes("Die Zahlen allein erklären nicht"),"Loss advice must not claim an unproven cause. Actual answer: "+answer);
});

Deno.test("two-year advisory account calculates gross-profit comparison only with confirmed EK in both months",()=>{
  const data=twoYearAdvisorTestAccount();
  const reply=advisorTestReply(data,"2026-10");
  const answer=reply("Wie hat sich mein Rohertrag gegenüber dem Vormonat verändert?");
  assert(answer.includes("Shop-Veränderung zu Vormonat 2026-09"),"Advisor must use the actual previous month in the comparison");
  assert(answer.includes("-2.496,00")&&answer.includes("-5.200,00"),"Advisor must calculate the real gross-profit and revenue deltas");
  assert(!answer.includes("Für die aktuell geladenen Stationsdaten sind keine bestätigten Werte für beide Zeiträume vorhanden"),"Confirmed current and prior-year EK must not trigger a stale missing-data answer");
  data.months["2026-09"].sourceEK=false;
  const missing=advisorTestReply(data,"2026-10")("Wie hat sich mein Rohertrag gegenüber dem Vormonat verändert?");
  assert(missing.includes("nicht berechenbar · bestätigter Umsatz/EK fehlt in mindestens einem Zeitraum"),"Missing EK in one period must suppress the gross-profit delta. Actual answer: "+missing);
});


Deno.test("unconfirmed group shrink and write-off values never become radar signals or simulation savings",()=>{
  const data=appFixture();
  const row=data.months["2026-10"];
  row.sourceShrink=true;
  row.groups.backshop.revenue=data.months["2026-09"].groups.backshop.revenue*.5;
  row.groups.backshop.shrink=9999;
  row.groups.backshop.writeoff=8888;
  row.groups.backshop._shrinkEntered=false;
  row.groups.backshop._writeoffEntered=false;
  const rt=runtime(data);
  const radar=rt.wowPriority("2026-10").find((r:any)=>r.g.id==="backshop");
  assert(radar,"Backshop row should remain available for other signals");
  assert(!radar.reasons.includes("Schwund auffällig"),"Unconfirmed group shrink must not create a radar signal");
  assert(!radar.reasons.includes("Abschriften auffällig"),"Unconfirmed group write-off must not create a radar signal");
  assert(radar.dataStatus.shrinkSourceAvailable===false&&radar.dataStatus.writeoffSourceAvailable===false,"Group loss source status must remain unconfirmed");
  const lossAdvice=advisorTestReply(data,"2026-10")("Wie entwickeln sich meine erfassten Verlustbeträge im Vergleich zum Vorjahr?");
  assert(!lossAdvice.includes("Es gibt bestätigte positive Werte auf Warengruppenebene"),"Advisor must not attribute unconfirmed group losses");
  const scenario=rt.scenarioResult({...rt.calc("2026-10").groups.find((g:any)=>g.id==="backshop"),shrink:9999,writeoff:8888,shrinkEntered:false,writeoffEntered:false},0,50,50,true);
  assert(scenario.shrinkGain===null&&scenario.writeoffGain===null,"Unconfirmed group loss amounts must not be monetized in simulation");
});


Deno.test("annual report excludes zero-sales months from EK-backed gross profit and margin",()=>{
  const data=appFixture();
  data.months["2025-01"].revenue=0;
  data.months["2025-01"].ek=10000;
  data.months["2025-01"].sourceEK=true;
  const expected=months.filter(m=>m.year===2025&&m.month!==1).reduce((sum,m)=>sum+m.revenue-m.ek,0);
  const rt=runtime(data);
  rt.yearly();
  const row=String(rt.target.innerHTML).match(/<tr><td>2025<\/td>.*?<\/tr>/)?.[0]||"";
  const formatted=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(expected);
  assert(row.includes(formatted),"Annual gross profit must use only months with both positive shop revenue and confirmed EK. Row: "+row);
  assert(row.includes("11/12 Monate")||row.includes("11/12"),"Annual completeness must continue to show only 11 revenue months");
});


Deno.test("monthly report does not present stale revenue and gross profit as confirmed values",()=>{
  const data=appFixture();
  data.months["2026-10"].sourceMonthly=false;
  data.months["2026-10"].revenue=125000;
  data.months["2026-10"].sourceEK=true;
  const rt=runtime(data);
  rt.report();
  const html=String(rt.target.innerHTML);
  assert(html.includes("Shop-Umsatz</div><div class=\"value\">Nicht erfasst"),"Report must label unconfirmed monthly revenue as not recorded");
  assert(html.includes("Rohertrag</div><div class=\"value\">Nicht berechenbar"),"Report must not calculate gross profit from stale revenue");
});


Deno.test("radar ignores stale group revenue when its source is not confirmed",()=>{
  const data=appFixture();
  data.months["2026-10"].groups.backshop._revenueEntered=false;
  const rt=runtime(data);
  assert(!rt.wowPriority("2026-10").some((r:any)=>r.g.id==="backshop"),"Unconfirmed group revenue must not create a radar priority");
});

Deno.test("monthly report marks inventory incomplete when a shop group's revenue is unconfirmed",()=>{
  const data=appFixture();
  data.months["2026-10"].sourceInventory=true;
  data.months["2026-10"].groups.backshop._revenueEntered=false;
  data.months["2026-10"].groups.backshop._stockEntered=true;
  const rt=runtime(data);
  rt.report();
  const html=String(rt.target.innerHTML);
  assert(html.includes("Teilbestand · nicht vollständig"),"Inventory completeness must require confirmed revenue and stock for every shop group");
  assert(html.includes("Umsatz dieser Warengruppe nicht bestätigt"),"Report must name the missing group revenue source");
});


Deno.test("two-year advisory account routes inventory and priority questions to data-backed analysis",()=>{
  const data=twoYearAdvisorTestAccount();
  const reply=advisorTestReply(data,"2026-10");
  const stock=reply("Wo ist mein Warenbestand kritisch?");
  assert(stock.includes("Bestandsanalyse")&&stock.includes("rechnerische Reichweite")&&stock.includes("17,7 Tage"),"Inventory question must report confirmed stock and calendar-day coverage. Actual answer: "+stock);
  assert(!stock.includes("Verlustanalyse"),"Inventory-only question must not be misclassified as shrink/write-off analysis");
  assert(stock.includes("kein eigener Zielwert hinterlegt"),"Without operator thresholds the advisor must not declare stock critical");
  data.months["2026-10"].sourceInventory=false;
  const unconfirmedStock=reply("Wo ist mein Warenbestand kritisch?");
  assert(unconfirmedStock.includes("keine bestätigte Inventurquelle")&&!unconfirmedStock.includes("Bestand 5.148"),"Stored group stock must not leak into advice when the inventory source is unconfirmed");
  const potential=reply("Wo liegt das größte wirtschaftliche Potenzial?");
  assert(potential.includes("Größtes wirtschaftliches Potenzial")&&potential.includes("+620,33")&&potential.includes("Modellannahme 25 %"),"Economic-potential question must show the top data-backed lever and its explicit assumption. Actual answer: "+potential);
  assert(!potential.includes("Spielzeug:"),"A singular biggest-potential question should not dump every ranked group");
  const priorities=reply("Welche drei Dinge sollte ich zuerst prüfen?");
  assert(priorities.includes("Priorisierte Prüffelder")&&priorities.includes("Backwaren:")&&priorities.includes("Spielzeug:")&&priorities.includes("Getränke:"),"Prioritization question must use the top three current radar signals. Actual answer: "+priorities);
  assert(!priorities.includes("Ich ordne deine Frage noch nicht sicher zu"),"Prioritization question must not fall back to generic clarification");
});

Deno.test("two-year advisor routes plural critical-stock wording and prioritization to live data before generic answers",()=>{
  const data=twoYearAdvisorTestAccount();
  const reply=advisorTestReply(data,"2026-10");
  for(const question of [
    "Wo ist mein Warenbestand kritisch?",
    "Welche Lagerbestände sind kritisch?",
    "Welche Bestände sind kritisch?"
  ]){
    const answer=reply(question);
    assert(answer.includes("Bestandsanalyse"),"Inventory wording must reach stock analysis: "+question+" -> "+answer);
    assert(!answer.includes("Verlustanalyse"),"Inventory-only wording must not be treated as loss analysis: "+question);
    assert(answer.includes("rechnerische Reichweite"),"Confirmed stock must include its calculated coverage: "+question);
  }
  const potential=reply("Wo liegt das größte wirtschaftliche Potenzial?");
  assert(potential.includes("Größtes wirtschaftliches Potenzial")&&potential.includes("+620,33")&&potential.includes("Modellannahme 25 %"),"Biggest-potential question must use confirmed data before generic guidance. Actual: "+potential);
  const priorities=reply("Welche drei wichtigsten nächsten Prüfungen sollte ich zuerst angehen?");
  assert(priorities.includes("Priorisierte Prüffelder")&&priorities.includes("Backwaren:")&&priorities.includes("Spielzeug:")&&priorities.includes("Getränke:"),"Three next checks must be ranked from current signals. Actual: "+priorities);
  assert(!priorities.includes("Ich brauche noch eine konkrete Zielgröße")&&!priorities.includes("Ich ordne deine Frage noch nicht sicher zu"),"Priority question must not return generic clarification. Actual: "+priorities);
});


Deno.test("intelligent data quality detects unallocated group totals without inventing causes",()=>{
  const data=appFixture();
  const month=data.months["2026-10"];
  const groupRevenue=Object.values(month.groups).reduce((sum:number,g:any)=>sum+Number(g.revenue||0),0);
  month.revenue=groupRevenue+1234;
  month.sourceMonthly=true;
  const rt=runtime(data);
  const quality=rt.dataQuality("2026-10");
  const turnover=quality.findings.find((f:any)=>String(f.label).startsWith("Shop-Umsatz"));
  assert(turnover,"Confirmed monthly and group revenue should be reconciled");
  assert(Math.abs(turnover.amount-1234)<0.01,"Unallocated turnover amount must be exact");
  assert(turnover.complete===true,"Fixture has confirmed values for every merchandise group");
  assert(turnover.coverage==="8/8","Coverage denominator must exclude the non-merchandise wash group");
  assert(quality.status==="check","A reconciliation difference should create a plausibility check, not a hard input error");
  assert(quality.findings.every((f:any)=>!/Diebstahl|Fehlerursache bewiesen/i.test(f.detail)),"Data quality must not claim a cause");
});
Deno.test("intelligent data quality labels partial group coverage instead of treating missing groups as zero",()=>{
  const data=appFixture();
  const month=data.months["2026-10"];
  month.groups.backshop._revenueEntered=false;
  const rt=runtime(data);
  const quality=rt.dataQuality("2026-10");
  const turnover=quality.findings.find((f:any)=>f.label==="Shop-Umsatz ohne Waschen");
  assert(turnover,"Remaining confirmed groups should still be compared with the monthly total");
  assert(turnover.complete===false&&turnover.coverage==="7/8","Missing group data must show the seven of eight merchandise groups actually covered");
  assert(quality.status==="check","Incomplete allocation must remain a check, not a critical error");
});
Deno.test("unconfirmed group revenue cannot create margins or comparison signals",()=>{
  const data=appFixture();
  const current=data.months["2026-10"],prior=data.months["2026-09"],priorYear=data.months["2025-10"];
  current.groups.backshop.revenue=1000;current.groups.backshop._revenueEntered=true;current.groups.backshop.ek=700;current.groups.backshop._ekEntered=true;
  prior.groups.backshop.revenue=2000;prior.groups.backshop._revenueEntered=false;prior.groups.backshop.ek=600;prior.groups.backshop._ekEntered=true;
  priorYear.groups.backshop.revenue=5000;priorYear.groups.backshop._revenueEntered=false;priorYear.groups.backshop.ek=1000;priorYear.groups.backshop._ekEntered=true;
  const rt=runtime(data);
  assert(rt.calc("2026-09").groups.find((g:any)=>g.id==="backshop").actualMargin===null,"Unconfirmed prior revenue must not produce an actual margin");
  const row=rt.wowPriority("2026-10").find((r:any)=>r.g.id==="backshop");
  assert(row,"Current confirmed group should remain eligible for review");
  assert(!row.reasons.some((x:string)=>x.includes("Ist-Marge liegt")),"Unconfirmed prior EK/revenue pair must not create a margin-drop signal");
  assert(!row.reasons.includes("Umsatz rückläufig"),"Unconfirmed prior revenue must not create a sales-drop signal");
  assert(row.seasonalContextAvailable===false&&row.priorYearRevenue===0,"Unconfirmed prior-year revenue must not suppress a real current trend");
});

Deno.test("advisor labels unconfirmed monthly and group revenue instead of quoting stale amounts",()=>{
  const data=appFixture();
  data.months["2026-10"].revenue=987654;
  data.months["2026-10"].sourceMonthly=false;
  data.months["2026-10"].groups.backshop.revenue=9876;
  data.months["2026-10"].groups.backshop._revenueEntered=false;
  data.months["2026-10"].groups.backshop.ek=1234;
  data.months["2026-10"].groups.backshop._ekEntered=true;
  const reply=advisorTestReply(data,"2026-10");
  const sales=reply("Warum ist mein Umsatz gesunken?");
  assert(sales.includes("Shop-Umsatz aktuell: nicht bestätigt")&&!sales.includes("987.654"),"Sales advice must not quote unconfirmed shop revenue");
  const margin=reply("Wie ist die Marge bei Backwaren?");
  assert(margin.includes("Umsatz nicht bestätigt")&&!margin.includes("9.876,00"),"Group margin advice must not quote stale group revenue");
  const order=reply("Welche Warengruppen haben den niedrigsten Umsatz und wo sollte ich nachbestellen?");
  assert(!order.includes("Backwaren (9.876,00"),"Ordering advice must not rank unconfirmed stale group revenue");
});

Deno.test("all merchandise group guidance remains strictly category-level",()=>{
  const rt=runtime(appFixture());
  const guidance=(id:string)=>rt.practiceGuidance({g:{id,name:id},reasons:["Ist-Marge unter Ihrem Zielwert"],dataStatus:{groupEkAvailable:true,previousMonthAvailable:true,inventorySourceAvailable:true,shrinkSourceAvailable:true}});
  const expected:Record<string,string[]> = {
    getraenke:["Lieferantenkonditionen","Kategorie-Verkaufspreise"],
    kaffee:["Rezeptur","Portionsgröße"],
    backshop:["Backintervalle","Bestandsverlauf"],
    waschen:["Verbrauchsmaterialien","Gutscheine"],
    "süsswaren":["Wareneinsatzquote","Zielbestand"],
    drogerie:["Kapitalbindung","Bestandswert"],
    lebensmittel:["Abschriften","Bestandsverlauf"],
    spielzeug:["Vorjahresmonat","Zielreichweite"],
    eis:["saisonalen Zusammenhang","Lieferantenkonditionen"]
  };
  for(const [id,terms] of Object.entries(expected)){
    const text=guidance(id);
    for(const term of terms)assert(text.toLowerCase().includes(term.toLowerCase()),id+" guidance missing "+term);
    assert(!/artikel|sku|einzelartikel|artikelnummer|stückmarge/i.test(text),id+" guidance must not require or imply article-level data: "+text);
    assert(text.includes("ERFOLGSKONTROLLE"),id+" guidance must include a follow-up check");
  }
});
Deno.test("cause diagnosis decomposes category gross-profit change and preserves evidence limits",()=>{
  const data=appFixture();
  const prior=data.months["2026-09"].groups.backshop,current=data.months["2026-10"].groups.backshop;
  prior.revenue=10000;prior._revenueEntered=true;prior.ek=6000;prior._ekEntered=true;
  current.revenue=12000;current._revenueEntered=true;current.ek=7800;current._ekEntered=true;
  const rt=runtime(data),diagnosis=rt.causeDiagnosis({id:"backshop",name:"Backwaren"},"2026-10");
  const revenueEffect=2000*(1-.6);
  const costRatioEffect=-12000*(.65-.6);
  const expectedGrossChange=(12000-7800)-(10000-6000);
  assert(Math.abs(revenueEffect+costRatioEffect-expectedGrossChange)<.001,"Category effects must reconcile exactly to the gross-profit change");
  assert(diagnosis.some((x:any)=>x.title==="Umsatzeffekt auf den Rohertrag"&&x.detail.includes("Absatzmenge lassen sich ohne Mengendaten nicht voneinander trennen")),"Revenue effect must state the quantity-data limitation");
  assert(diagnosis.some((x:any)=>x.title==="Wareneinsatzquote verändert"&&x.detail.includes("Belastung")),"Cost-ratio effect must identify the adverse impact");
  assert(diagnosis.some((x:any)=>x.title==="Wareneinsatzquote verändert"&&x.state==="proven"),"The cost-ratio effect is a confirmed arithmetic bridge even when it is adverse");
  current.ek=6600;
  const improved=rt.causeDiagnosis({id:"backshop",name:"Backwaren"},"2026-10");
  assert(improved.some((x:any)=>x.title==="Wareneinsatzquote verändert"&&x.detail.includes("Entlastung")),"A lower cost ratio must be described as a gross-profit relief, not a burden");
  assert(!diagnosis.some((x:any)=>/Artikelnummer|Einzelartikel|Artikelmenge|SKU/i.test(x.title+" "+x.detail)),"Diagnosis must not request article-level data");
});



Deno.test("priority cards rank confirmed euro exposure before signal count",()=>{
  const data=appFixture();
  const current=data.months["2026-10"],previous=data.months["2026-09"];
  const big=current.groups.backshop,small=current.groups.kaffee,smallPrev=previous.groups.kaffee;
  big.revenue=20000;big._revenueEntered=true;big.ek=20000*(1-59.2/100);big._ekEntered=true;
  big.shrink=2500;big._shrinkEntered=true;big.writeoff=0;big._writeoffEntered=true;
  small.revenue=1000;small._revenueEntered=true;small.ek=600;small._ekEntered=true;
  smallPrev.revenue=2000;smallPrev._revenueEntered=true;smallPrev.ek=800;smallPrev._ekEntered=true;
  data.settings.targetMargins={kaffee:60};
  const rt=runtime(data),rows=rt.wowPriority("2026-10");
  const bigRow=rows.find((r:any)=>r.g.id==="backshop"),smallRow=rows.find((r:any)=>r.g.id==="kaffee");
  assert(!!bigRow&&!!smallRow,"Synthetic comparison must produce both economic priority cards");
  assert(bigRow.economicExposure>smallRow.economicExposure,"Large confirmed shrink exposure must exceed the smaller overlapping margin/sales exposure");
  assert(bigRow.signalScore<smallRow.signalScore,"Synthetic case must challenge signal-count-first ranking");
  assert(rows[0].g.id==="backshop","Higher confirmed euro exposure must rank first even with fewer signals");
  for(let i=1;i<rows.length;i++)assert(rows[i-1].economicExposure+0.000001>=rows[i].economicExposure,
    "Priority rows must be sorted by confirmed euro exposure");
  assert(rows.every((r:any)=>Number.isFinite(r.economicExposure)&&r.economicExposure>=0),
    "Economic ranking must use finite, non-negative confirmed exposure only");
});

Deno.test("advisory rejects article-level analysis and keeps monthly category guidance available",()=>{
  const norm=appFunction("advisorNorm","advisorScopeGuard",[],{});
  const guard=appFunction("advisorScopeGuard","advisorKnowledgeHtml",["advisorNorm"],{advisorNorm:norm});
  for(const q of ["Welche Artikel soll ich auslisten?","Artikelabsatz je SKU vergleichen","Artikelnummer und Stückmarge prüfen","Stückpreis je Einzelartikel vergleichen","Welche Artikel bei der nächsten Bestellung reduzieren?"]){
    const answer=guard(q);
    assert(answer.includes("wertet bewusst keine Einzelartikel"),"Article-level request must be redirected to group-level analysis: "+q);
  }
  assert(guard("Wie hat sich die Wareneinsatzquote der Getränke entwickelt?")==="","Valid group-level question must remain available");
  assert(!html.includes("articleTiles")&&!html.includes("articleObservations")&&!html.includes("renderArticleDiagnostics")&&!html.includes("saveArticleDiagnostic"),"Legacy article-analysis UI/functions must not return");
});

Deno.test("advisory follow-up skips months without the metric relevant to the saved measure",()=>{
  const outcome=appFunction("calculateAdvisoryOutcome","initAdvisorCaseActions",[],{});
  const data:any={
    "2026-10":{groups:[{id:"backshop",revenue:1000,ek:400,revenueEntered:true,ekEntered:true,actualMargin:60,shrink:20,shrinkEntered:true,writeoff:0,writeoffEntered:false,stock:0,stockEntered:false}],sourceShrink:true,sourceInventory:false},
    "2026-11":{groups:[{id:"backshop",revenue:1100,ek:440,revenueEntered:true,ekEntered:true,actualMargin:60,shrink:0,shrinkEntered:false,writeoff:0,writeoffEntered:false,stock:0,stockEntered:false}],sourceShrink:false,sourceInventory:false},
    "2026-12":{groups:[{id:"backshop",revenue:1200,ek:480,revenueEntered:true,ekEntered:true,actualMargin:60,shrink:12,shrinkEntered:true,writeoff:0,writeoffEntered:false,stock:0,stockEntered:false}],sourceShrink:true,sourceInventory:false}
  };
  const follow=appFunction("advisoryCaseFollowUp","reportPriorityGuidance",["keys","hasData","calc","calculateAdvisoryOutcome"],{
    keys:()=>Object.keys(data).sort(),hasData:(k:string)=>!!data[k],calc:(k:string)=>data[k],calculateAdvisoryOutcome:outcome
  });
  const c={month:"2026-10",groupId:"backshop",measures:["Schwund der Warengruppe reduzieren"],baseline:{shrinkRate:2,shrinkConfirmed:true,revenue:1000,revenueConfirmed:true}};
  const result=follow(c);
  assert(result?.month==="2026-12","Follow-up must skip November because the saved shrink measure has no confirmed November metric");
  assert(result.metrics.some((m:any)=>m.key==="shrinkRate"),"Follow-up must return the confirmed metric relevant to the saved measure");
});

Deno.test("measure economics never treats a missing modeled benefit as zero",()=>{
  const calc=appFunction("calculateMeasureEconomics","measureEconomicsSummary",["monthlyBenefit","values"],{});
  const costs={hoursPerMonth:2,hourlyCost:25,oneTimeCost:100,monthlyCost:10};
  const missing=calc(null,costs);
  assert(missing.complete===false&&missing.benefit===null,"Missing potential must keep the economic result open, not turn it into a €0 benefit");
  const valid=calc(200,costs);
  assert(valid.complete===true,"Complete cost inputs and a modeled benefit should permit a scenario balance");
  assert(Math.abs(valid.monthlyBalance-140)<.001,"Monthly balance must subtract labor and recurring cost from modeled monthly benefit");
  assert(Math.abs(valid.firstMonthBalance-40)<.001,"First-month balance must additionally subtract one-time implementation cost");
  assert(Math.abs(valid.annualBalance-1580)<.001,"12-month balance must subtract one-time cost once");
});

Deno.test("operational advisor recommendations do not depend on article-level sales or stock data",()=>{
  for(const obsolete of ["Absatz je Artikel","Artikelabsatz im vergleichbaren Zeitraum","Stückabsatz","EK je Einheit","Vergleiche je Getränk Artikelabsatz","konkrete Streichliste je Artikel"]){
    assert(!html.includes(obsolete),"Article-level recommendation remains in the application: "+obsolete);
  }
  for(const required of ["Warengruppenumsatz","bestätigten Bestandswert","Wareneinsatzquote","Warengruppensummen"]){
    assert(html.includes(required),"Category-level advisory basis missing: "+required);
  }
});

Deno.test("simulation safe-number helper is present in production and handles missing values",()=>{
  const safe=appFunction("grossSafe","scenarioResult",[],{});
  assert(safe(null)===0&&safe(undefined)===0,"Missing numeric scenario components must safely contribute zero");
  assert(safe("12.5")===12.5&&safe("invalid")===0,"Scenario helper must safely normalize numeric inputs");
});

Deno.test("advisor consistently separates data findings, hypotheses and action proposals",()=>{
  const frame=appFunction("advisorEvidenceResponse","advisorReply",[],{});
  const sample="<b>Rohertrag</b><p>Der Rohertrag ist um 120 € gestiegen.</p>";
  const data=frame(sample,"data");
  const guidance=frame(sample,"guidance");
  const missing=frame(sample,"missing");
  for(const response of [data,guidance,missing]){
    assert(response.includes("DATENBEFUND")||response.includes("FACHLICHE EINORDNUNG")||response.includes("DATENLAGE"),"Response lacks an explicit evidence status");
    assert(response.includes("VERMUTUNG / URSACHE"),"Response does not separate causes from findings");
    assert(response.includes("HANDLUNGSVORSCHLAG"),"Response does not label recommendations");
    assert(response.includes("beweist für sich allein keine Ursache"),"Response overstates causal certainty");
    assert(response.includes("dokumentiertem Ausgangswert"),"Response lacks a measurable follow-up principle");
  }
  assert(data.includes("DATENBEFUND"),"Data-backed response must be labelled as a data finding");
  assert(guidance.includes("FACHLICHE EINORDNUNG"),"General guidance must not look like a station-specific finding");
  assert(missing.includes("DATENLAGE"),"Missing-data response must be explicitly labelled");
});

Deno.test("advisor response routing applies evidence framing to every economic answer path",()=>{
  const start=html.indexOf("function advisorReply(raw){");
  const end=html.indexOf("\nfunction initAdvisorChat",start);
  assert(start>=0&&end>start,"Could not locate advisor reply router");
  const router=html.slice(start,end);
  assert(router.includes("advisorEvidenceResponse(direct,'guidance')"),"Direct economic answers are not framed");
  assert(router.includes("advisorEvidenceResponse(advisory,'guidance')"),"General guidance is not framed");
  assert(router.includes("advisorEvidenceResponse(noData,'missing')"),"Missing-data answers are not framed");
  assert(router.includes("advisorEvidenceResponse(base,'data')")||router.includes("advisorEvidenceResponse(knowledge?base+knowledge:base,'data')"),"Data analysis answers are not framed");
});


Deno.test("measure economics inputs update only their own cost field",()=>{
  const start=html.indexOf("function initMeasureEconomics(){");
  const end=html.indexOf("\nfunction calculateAdvisoryOutcome",start);
  assert(start>=0&&end>start,"Could not locate measure economics input handler");
  const handler=html.slice(start,end);
  assert(handler.includes("el.dataset.measureGroup===groupId&&el.dataset.measureCost===field&&el!==input"),"Changing one cost input must not copy its value into the other three fields");
  assert(!handler.includes("el.dataset.measureGroup===groupId&&el!==input)el.value=raw"),"Broad group-level synchronization would overwrite independent cost inputs");
});


Deno.test("one-time measure implementation costs are deducted once, not twelve times",()=>{
  const calculate=appFunction("calculateMeasureEconomics","measureEconomicsSummary",[],{});
  const result=calculate(41,{hoursPerMonth:5,hourlyCost:25,oneTimeCost:100,monthlyCost:40});
  assert(result.complete,"Complete cost inputs must produce a balance");
  assert(result.labour===125&&result.recurring===165,"Monthly personnel and recurring costs must remain separate");
  assert(result.monthlyBalance===-124,"Monthly balance must exclude the one-time implementation cost");
  assert(result.firstMonthBalance===-224,"The first month must deduct the one-time cost exactly once");
  assert(result.annualBalance===-1588,"The 12-month balance must deduct recurring costs twelve times and the one-time cost only once");
  assert(result.annualBalance===result.monthlyBalance*12-result.oneTime,"Annual formula must subtract oneTime only once");
  assert(html.includes("Saldo im ersten Monat inklusive Einmalaufwand"),"The first-month balance must be clearly labelled");
  assert(html.includes("12-Monats-Saldo inklusive einmaligem Aufwand (nicht × 12)"),"The annual summary must state that one-time costs are not multiplied by twelve");
});

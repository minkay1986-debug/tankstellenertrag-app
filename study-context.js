/* TankstellenErtrag V1.1 · geprüfter Studienkontext
   Studien sind Kontext, nie Ursachebeweis. */
(function(){
  const state={items:[],loaded:false};
  const TOPICS={
    shrink:["schwund","verlust","inventur","abschrift","warenwirtschaft"],
    margin:["marge","rohertrag","preis","sortiment","warenwirtschaft","category management"],
    backshop:["backshop","backwaren","foodservice","snack","to-go","gastronomie"],
    getraenke:["getränk","getraenke","beverage","sortiment"],
    kaffee:["kaffee","foodservice","getränk","getraenke"],
    kunden:["konsum","kunden","einkaufsverhalten","preis-leistung","erreichbarkeit"],
    shop:["shop","convenience","sortiment","einzelhandel","tankstelle"],
    kpi:["kennzahl","umsatz","einzelhandel","tankstelle","konjunktur"]
  };
  function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ß/g,"ss");}
  function relevance(item,topics){
    const hay=norm([item.title,item.summary,item.type].join(" "));
    let score=0;
    for(const topic of topics||[]){
      for(const term of (TOPICS[topic]||[])) if(hay.includes(norm(term))) score++;
    }
    if(item.verified_source) score+=2;
    return score;
  }
  async function load(){
    if(state.loaded)return state.items;
    try{
      const r=await fetch("./studien/studien.json",{cache:"no-store"});
      if(!r.ok)throw new Error("Studienwissen nicht erreichbar");
      const data=await r.json();
      state.items=Array.isArray(data)?data.filter(x=>x&&x.url&&x.source&&x.verified_source):[];
    }catch(e){state.items=[];console.warn("Studienkontext:",e.message||e);}
    state.loaded=true; return state.items;
  }
  async function match(topics,limit=3){
    const items=await load();
    return items.map(item=>({...item,_score:relevance(item,topics)}))
      .filter(x=>x._score>0)
      .sort((a,b)=>b._score-a._score)
      .slice(0,limit);
  }
  function cards(items){
    if(!items.length)return '<div class="small">Für dieses Prüffeld liegt aktuell keine passende verifizierte Studie im Wissensbestand vor.</div>';
    return '<div class="study-context-grid">'+items.map(x=>'<article class="study-context-card"><div class="study-context-meta">'+esc(x.source)+' · '+esc(x.date||"")+'</div><h4>'+esc(x.title)+'</h4><p>'+esc(x.summary||"")+'</p><div class="study-context-rule">Branchenkontext · kein Ursachenbeweis</div><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Originalquelle →</a></article>').join("")+'</div>';
  }
  function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
  async function htmlForRows(rows){
    const topics=new Set(["shop"]);
    (rows||[]).forEach(r=>{
      const id=r?.g?.id||"";
      if(id==="waschen")return;
      topics.add(id==="backshop"?"backshop":id==="getraenke"?"getraenke":id==="kaffee"?"kaffee":"margin");
      if((r?.shrinkRate||0)>0)topics.add("shrink");
    });
    const items=await match([...topics],3);
    return '<div class="panel study-context-panel"><div class="eyebrow">V1.1 · Verifizierter Branchenkontext</div><h2>Passende Studien zur Einordnung</h2><p class="small">Diese Quellen ergänzen die Stationsdaten fachlich. Sie werden nicht als Beweis für die Ursache einer Abweichung verwendet.</p>'+cards(items)+'</div>';
  }
  async function htmlForReport(rows){
    const items=await match(["shop","margin","backshop","shrink"],4);
    return '<div class="study-report-context"><h3>Branchenkontext</h3><p>Die folgenden verifizierten Quellen dienen ausschließlich zur fachlichen Einordnung. Die Feststellungen dieses Berichts beruhen auf den Stationsdaten; die Studien beweisen keine konkrete Ursache.</p>'+cards(items)+'</div>';
  }
  window.TEStudyContext={load,match,htmlForRows,htmlForReport};
})();
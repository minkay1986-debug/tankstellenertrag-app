import html, json, os, re, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

BASE="https://app.tankstellenertrag.de"
FEEDS=[
 ("Warenwirtschaft & Studien","https://news.google.com/rss/search?q="+urllib.parse.quote('(Tankstelle OR Tankstellenshop OR Convenience) (Warenwirtschaft OR Marge OR Wareneinsatz OR Studie OR Untersuchung) when:45d')+"&hl=de&gl=DE&ceid=DE:de"),
 ("Einkaufsverhalten & Shopper Insights","https://news.google.com/rss/search?q="+urllib.parse.quote('(Tankstelle OR Convenience OR Snack OR Getränke) (Einkaufsverhalten OR Kaufverhalten OR Shopper OR Konsumenten OR Kaufbereitschaft OR Studie) when:45d')+"&hl=de&gl=DE&ceid=DE:de"),
 ("Wetter & Nachfrage","https://news.google.com/rss/search?q="+urllib.parse.quote('(Einzelhandel OR Tankstelle OR Gastronomie OR Getränke) (Wetter OR Temperatur OR Hitze OR Regen OR Schnee) (Umsatz OR Nachfrage OR Kaufverhalten OR Studie) when:45d')+"&hl=de&gl=DE&ceid=DE:de"),
 ("Events & Kaufbereitschaft","https://news.google.com/rss/search?q="+urllib.parse.quote('(Einzelhandel OR Tankstelle OR Convenience OR Getränke OR Snacks) (Event OR Veranstaltung OR Feiertag OR Fußball OR Festival) (Umsatz OR Nachfrage OR Kaufverhalten OR Studie) when:45d')+"&hl=de&gl=DE&ceid=DE:de"),
 ("Konsumforschung & Kaufbereitschaft","https://news.google.com/rss/search?q="+urllib.parse.quote('(Kaufbereitschaft OR Konsumverhalten OR Kaufabsicht OR Shopper Insights) (Lebensmittel OR Getränke OR Snacks OR Einzelhandel) Studie Deutschland when:45d')+"&hl=de&gl=DE&ceid=DE:de"),
]
KEYWORDS={"warenwirtschaft":6,"wareneinsatz":6,"marge":5,"shopper insights":6,"einkaufsverhalten":6,"kaufverhalten":5,"kaufbereitschaft":6,"kaufabsicht":6,"konsumverhalten":5,"konsumenten":3,"studie":4,"untersuchung":3,"umsatz":2,"nachfrage":3,"wetter":3,"temperatur":2,"hitze":2,"regen":2,"schnee":2,"event":3,"veranstaltung":3,"feiertag":3,"fußball":2,"festival":2,"einzelhandel":2,"tankstelle":3,"tankstellenshop":4,"convenience":3,"snack":2,"getränk":2}

def clean(s):
    s=re.sub(r"<[^>]+>"," ",s or "")
    return re.sub(r"\s+"," ",html.unescape(s)).strip()

def date_of(s):
    try:
        parsed = parsedate_to_datetime(s)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except Exception:
        return ""

def slug(s):
    s=re.sub(r"[^a-z0-9äöüß ]+","",s.lower()).replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss")
    return re.sub(r"-+","-",re.sub(r"\s+","-",s)).strip("-")[:90]

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"TankstellenErtrag-NewsBot/1.0"})
    with urllib.request.urlopen(req,timeout=20) as r:return r.read()

items={}
feed_stats=[]
now=datetime.now(timezone.utc)
minimum_date=now-timedelta(days=45)
for category,url in FEEDS:
    feed_count=0
    rejected_old=0
    try:
        root=ET.fromstring(fetch(url))
        for it in root.findall(".//item"):
            title=clean(it.findtext("title"))
            link=it.findtext("link") or ""
            desc=clean(it.findtext("description"))
            pub=date_of(it.findtext("pubDate") or "")
            if not pub:
                print(f"[WARN] {category}: Meldung ohne gültiges Veröffentlichungsdatum übersprungen: {title[:100]}")
                continue
            published_dt=datetime.fromisoformat(pub)
            if published_dt < minimum_date:
                rejected_old += 1
                continue
            combined=(title+" "+desc).lower()
            # Exclude celebrity/entertainment stories that merely mention a gas station.
            noise_terms=("bademantel","promi","prominente","schöneberger","celebrity","klatsch","tratsch","liebesleben","tv-star","krebsrisiko","magenkrebs","krebs-studie","krebsrisiko","krankheitsrisiko","medizinische warnung","gesundheitsrisiko","weinbergen","klimawandel","starkregen in österreich","hitzebekämpfung")
            if any(term in combined for term in noise_terms):
                print(f"[FILTER] Nicht fachlich relevant: {title[:100]}")
                continue
            score=sum(v for k,v in KEYWORDS.items() if k in combined)
            # Keep the feed focused on the requested topics, not generic fuel-price headlines.
            topic_terms=("warenwirtschaft","wareneinsatz","marge","shopper","einkaufsverhalten","kaufverhalten","kaufbereitschaft","kaufabsicht","konsumverhalten","konsumenten","studie","untersuchung","umsatz","nachfrage","wetter","temperatur","hitze","regen","schnee","event","veranstaltung","feiertag","fußball","festival","einzelhandel","snack","getränk","convenience")
            if score<5 or not any(term in combined for term in topic_terms) or not title or not link:
                continue
            source=clean((re.search(r"\s-\s([^\-]+)$",title).group(1) if re.search(r"\s-\s([^\-]+)$",title) else "Originalquelle"))
            title=re.sub(r"\s+-\s+[^-]+$","",title).strip()
            summary=(desc or "Aktuelle Meldung mit möglicher Relevanz für Tankstellenbetreiber.")
            summary=summary[:420].rstrip()
            key=link.split("&")[0]
            item={"title":title,"link":link,"date":pub[:10],"published":pub,"category":category,"source":source,"summary":summary,"score":score}
            items[key]=item
            feed_count += 1
        feed_stats.append((category, "OK", feed_count, rejected_old, ""))
    except Exception as exc:
        message=f"{type(exc).__name__}: {exc}"
        print(f"[ERROR] Feed '{category}' konnte nicht gelesen werden: {message}")
        feed_stats.append((category, "FEHLER", feed_count, rejected_old, message))

for category,status,count,old_count,error in feed_stats:
    print(f"[FEED] {category}: {status}; passende Meldungen={count}; älter als 45 Tage verworfen={old_count}" + (f"; Details={error}" if error else ""))

items=sorted(items.values(),key=lambda x:(x["published"],x["score"]),reverse=True)[:30]
# Fail closed: never replace the published news archive with a tiny/empty result.
if len(items) < 5:
    raise SystemExit(f"FEHLER: Nur {len(items)} passende Meldungen gefunden. Bestehende News-Dateien bleiben unverändert.")
os.makedirs("news/articles",exist_ok=True)
out=[]
for n in items:
    n["slug"]=slug(n["title"]) or "meldung"
    path=f"news/articles/{n['slug']}.html"
    canonical=f"{BASE}/{path}"
    page=f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(n['title'])} | TankstellenErtrag</title><meta name="description" content="{html.escape(n['summary'][:155])}"><link rel="canonical" href="{canonical}"><script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"NewsArticle","headline":n["title"],"datePublished":n["published"],"dateModified":n["published"],"author":{"@type":"Organization","name":"TankstellenErtrag"},"publisher":{"@type":"Organization","name":"TankstellenErtrag"},"mainEntityOfPage":{"@type":"WebPage","@id":canonical}},ensure_ascii=False)}</script><style>body{{margin:0;background:#0d0f10;color:#f5f6f7;font-family:Inter,system-ui,sans-serif}}main{{width:min(820px,calc(100% - 32px));margin:auto;padding:45px 0 70px}}a{{color:#ff9b4a}}.eyebrow{{color:#f47b20;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}}h1{{font-size:42px;line-height:1.08}}.meta{{color:#aeb6bc;font-size:12px}}.summary{{font-size:19px;line-height:1.7;color:#d6dce0}}.box{{margin-top:28px;padding:20px;background:#181c1f;border:1px solid #353c41;border-radius:14px}}footer{{color:#737d83;font-size:11px;margin-top:45px}}</style></head><body><main><div class="eyebrow">{html.escape(n["category"])}</div><h1>{html.escape(n["title"])}</h1><div class="meta">{html.escape(n["date"])} · Quelle: {html.escape(n["source"])}</div><p class="summary">{html.escape(n["summary"])}</p><div class="box"><strong>Einordnung für Tankstellenbetreiber</strong><p>Diese Meldung wurde automatisch als potenziell relevante Brancheninformation erfasst. Für Entscheidungen sollte die Originalquelle geprüft und die konkrete Situation der eigenen Station berücksichtigt werden.</p><p><a href="{html.escape(n["link"])}" rel="noopener noreferrer">Originalquelle öffnen →</a></p></div><p><a href="../../news.html">← Zurück zu News & Wissen</a></p><footer>TankstellenErtrag · Warenwirtschaftliche Monatsanalyse</footer></main></body></html>"""
    open(path,"w",encoding="utf-8").write(page)
    out.append({k:n[k] for k in ["title","date","category","source","summary","slug","link"]})
open("news/news.json","w",encoding="utf-8").write(json.dumps(out,ensure_ascii=False,indent=2))
# Minimal sitemap for all generated article URLs.
urls=[BASE+"/news.html"]+[BASE+"/news/articles/"+n["slug"]+".html" for n in out]
xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f"<url><loc>{html.escape(u)}</loc></url>" for u in urls)+"</urlset>"
open("news-sitemap.xml","w",encoding="utf-8").write(xml)
fresh_count=sum(1 for n in out if n.get("date") and (now-datetime.fromisoformat(n["date"]+"T00:00:00+00:00")).days <= 7)
print(f"Generated {len(out)} news items; davon {fresh_count} innerhalb der letzten 7 Tage")
if not out:
    raise SystemExit("FEHLER: Keine aktuellen Meldungen erzeugt. Bestehende News-Dateien dürfen nicht leer veröffentlicht werden.")
if not any(status == "OK" for _,status,_,_,_ in feed_stats):
    raise SystemExit("FEHLER: Kein einziger RSS-Feed konnte erfolgreich gelesen werden.")

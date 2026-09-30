import html, json, os, re, urllib.parse, urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

BASE="https://app.tankstellenertrag.de"
FEEDS=[
 ("Tankstellen & Branche","https://news.google.com/rss/search?q="+urllib.parse.quote("Tankstelle Branche Deutschland")+"&hl=de&gl=DE&ceid=DE:de"),
 ("Shop & Sortiment","https://news.google.com/rss/search?q="+urllib.parse.quote("Tankstelle Shop Sortiment Convenience Deutschland")+"&hl=de&gl=DE&ceid=DE:de"),
 ("Food & Backshop","https://news.google.com/rss/search?q="+urllib.parse.quote("Tankstelle Backshop Bistro Food Convenience Deutschland")+"&hl=de&gl=DE&ceid=DE:de"),
 ("Studien & Kennzahlen","https://news.google.com/rss/search?q="+urllib.parse.quote("Tankstellen Studie Shop Konsum Deutschland")+"&hl=de&gl=DE&ceid=DE:de"),
 ("Neuheiten","https://news.google.com/rss/search?q="+urllib.parse.quote("Tankstelle neues Produkt Neuheit Getränke Snacks Deutschland")+"&hl=de&gl=DE&ceid=DE:de"),
 ("Regulierung","https://news.google.com/rss/search?q="+urllib.parse.quote("Tankstelle neue Regelung Gesetz Deutschland Shop")+"&hl=de&gl=DE&ceid=DE:de"),
]
KEYWORDS={"tankstelle":4,"tankstellen":4,"shop":3,"convenience":3,"backshop":3,"bistro":3,"warenwirtschaft":5,"sortiment":4,"marge":4,"studie":3,"neuheit":3,"produkt":3,"snack":2,"getränk":2,"regul":2,"pfand":2,"verkauf":1}

def clean(s):
    s=re.sub(r"<[^>]+>"," ",s or "")
    return re.sub(r"\s+"," ",html.unescape(s)).strip()

def date_of(s):
    try:return parsedate_to_datetime(s).astimezone(timezone.utc).isoformat()
    except:return datetime.now(timezone.utc).isoformat()

def slug(s):
    s=re.sub(r"[^a-z0-9äöüß ]+","",s.lower()).replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss")
    return re.sub(r"-+","-",re.sub(r"\s+","-",s)).strip("-")[:90]

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"TankstellenErtrag-NewsBot/1.0"})
    with urllib.request.urlopen(req,timeout=20) as r:return r.read()

items={}
for category,url in FEEDS:
    try:
        root=ET.fromstring(fetch(url))
        for it in root.findall(".//item"):
            title=clean(it.findtext("title"))
            link=it.findtext("link") or ""
            desc=clean(it.findtext("description"))
            pub=date_of(it.findtext("pubDate") or "")
            score=sum(v for k,v in KEYWORDS.items() if k in (title+" "+desc).lower())
            if score<4 or not title or not link: continue
            source=clean((re.search(r"\s-\s([^\-]+)$",title).group(1) if re.search(r"\s-\s([^\-]+)$",title) else "Originalquelle"))
            title=re.sub(r"\s+-\s+[^-]+$","",title).strip()
            summary=(desc or "Aktuelle Meldung mit möglicher Relevanz für Tankstellenbetreiber.")
            summary=summary[:420].rstrip()
            key=link.split("&")[0]
            item={"title":title,"link":link,"date":pub[:10],"published":pub,"category":category,"source":source,"summary":summary,"score":score}
            items[key]=item
    except Exception:
        continue

items=sorted(items.values(),key=lambda x:(x["score"],x["published"]),reverse=True)[:30]
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
print(f"Generated {len(out)} news items")

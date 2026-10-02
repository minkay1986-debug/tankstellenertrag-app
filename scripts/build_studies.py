import html, json, os, re, urllib.parse, urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

BASE = "https://app.tankstellenertrag.de"

# Official sources receive higher trust. UNITI is explicitly included because
# its Shop & Convenience work and annual tank-station survey are highly relevant
# to the target audience.
SOURCES = [
    {
        "name": "UNITI e.V.",
        "domain": "uniti.de",
        "urls": [
            "https://www.uniti.de/kommunikation/pressemitteilungen",
            "https://www.uniti.de/politik/news",
            "https://www.uniti.de/tankstellenerhebung",
        ],
        "priority": 10,
    },
    {
        "name": "EHI Retail Institute",
        "domain": "ehi.org",
        "urls": [
            "https://www.ehi.org/",
        ],
        "priority": 8,
    },
]

QUERIES = [
    ("UNITI", "site:uniti.de Tankstelle Shop Convenience Studie Erhebung Kennzahlen"),
    ("UNITI", "site:uniti.de Tankstellen Shop Sortiment Foodservice Studie"),
    ("UNITI", "site:uniti.de Tankstellenerhebung Jahreserhebung"),
    ("EHI", "site:ehi.org Tankstelle Convenience Shop Studie"),
    ("Branche", "Tankstelle Shop Convenience Studie Deutschland"),
    ("Branche", "Tankstellen Warenwirtschaft Sortiment Marge Studie"),
]

KEYWORDS = {
    "tankstelle": 5, "tankstellen": 5, "shop": 3, "convenience": 4,
    "sortiment": 4, "warenwirtschaft": 5, "marge": 4, "rohertrag": 4,
    "schwund": 4, "foodservice": 4, "bistro": 3, "backshop": 3,
    "erhebung": 5, "jahreserhebung": 6, "studie": 5, "kennzahl": 4,
    "category management": 5, "merchandising": 4, "kundenbindung": 3,
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "TankstellenErtrag-StudyBot/1.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()

def clean(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def date_of(value):
    if not value:
        return ""
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except Exception:
        m = re.search(r"(20\d\d)[-/.](\d\d)[-/.](\d\d)", value)
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}T00:00:00+00:00" if m else ""

def slug(value):
    value = re.sub(r"[^a-z0-9äöüß ]+", "", value.lower())
    value = value.replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss")
    return re.sub(r"-+", "-", re.sub(r"\s+", "-", value)).strip("-")[:90] or "studie"

def score(title, text, source_priority):
    hay = (title + " " + text).lower()
    return source_priority + sum(weight for key, weight in KEYWORDS.items() if key in hay)

def rss_items(url, source_name, source_domain, source_priority):
    result = []
    try:
        root = ET.fromstring(fetch(url))
        for item in root.findall(".//item"):
            title = clean(item.findtext("title"))
            link = item.findtext("link") or ""
            desc = clean(item.findtext("description"))
            pub = date_of(item.findtext("pubDate") or "")
            s = score(title, desc, source_priority)
            if title and link and s >= 12:
                result.append({
                    "title": title,
                    "url": link,
                    "published": pub,
                    "summary": desc[:700],
                    "source": source_name,
                    "domain": source_domain,
                    "score": s,
                })
    except Exception:
        pass
    return result

def google_rss(query, source_name):
    url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(query) + "&hl=de&gl=DE&ceid=DE:de"
    priority = next((s["priority"] for s in SOURCES if s["name"] == source_name), 5)
    domain = next((s["domain"] for s in SOURCES if s["name"] == source_name), "")
    return rss_items(url, source_name, domain, priority)

items = {}

for source_name, query in QUERIES:
    for item in google_rss(query, source_name):
        # Keep the best-scoring representation of the same URL.
        old = items.get(item["url"])
        if old is None or item["score"] > old["score"]:
            items[item["url"]] = item

# Add a direct UNITI source as a permanent anchor. This prevents the knowledge
# base from depending solely on Google News indexing.
uniti_anchor = {
    "title": "UNITI-Jahreserhebung 2026: Tankstellen stellen sich wirtschaftlich breiter auf",
    "url": "https://www.uniti.de/kommunikation/pressemitteilungen/artikel/tankstellen-in-deutschland-stellen-sich-wirtschaftlich-immer-breiter-auf",
    "published": "2026-01-15T00:00:00+00:00",
    "summary": "UNITI berichtet über die Jahreserhebung 2026 und die wachsende Bedeutung von Shop & Convenience sowie Carwash für Umsatz und Ertrag von Tankstellen.",
    "source": "UNITI e.V.",
    "domain": "uniti.de",
    "score": 20,
}
items[uniti_anchor["url"]] = uniti_anchor

selected = sorted(items.values(), key=lambda x: (x["score"], x["published"]), reverse=True)[:50]

os.makedirs("studien", exist_ok=True)
records = []
for item in selected:
    item["date"] = item["published"][:10] if item["published"] else ""
    item["slug"] = slug(item["title"])
    item["type"] = "Branchenstudie / Erhebung" if any(k in (item["title"] + " " + item["summary"]).lower() for k in ["studie", "erhebung", "kennzahl", "jahreserhebung"]) else "Branchenwissen"
    item["use"] = "Kontext"
    item["evidence_rule"] = "Nicht als Beweis für eine konkrete Ursache der einzelnen Station verwenden."
    records.append({
        k: item[k] for k in [
            "title", "url", "date", "source", "domain", "type",
            "summary", "score", "use", "evidence_rule"
        ]
    })

with open("studien/studien.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

cards = []
for r in records[:30]:
    cards.append(
        '<article><div class="meta">' + html.escape(r["source"]) + ' · ' + html.escape(r["date"]) +
        '</div><h2>' + html.escape(r["title"]) + '</h2><p>' + html.escape(r["summary"]) +
        '</p><div class="tag">Kontext – keine Ursachenbeweisführung</div><a href="' +
        html.escape(r["url"]) + '" rel="noopener noreferrer">Originalquelle öffnen →</a></article>'
    )

page = '''<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Branchenstudien & Erhebungen | TankstellenErtrag</title>
<meta name="description" content="Ausgewählte Branchenstudien, Erhebungen und Kennzahlen für Tankstellen, Shop und Convenience.">
<link rel="canonical" href="https://app.tankstellenertrag.de/studien/">
<style>
body{margin:0;background:#0d0f10;color:#f5f6f7;font-family:Inter,system-ui,sans-serif}
main{width:min(1000px,calc(100% - 32px));margin:auto;padding:42px 0 70px}
.eyebrow{color:#f47b20;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}
h1{font-size:40px;line-height:1.08;margin:10px 0}
.lead{color:#cbd1d5;line-height:1.65;max-width:780px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:28px}
article{background:#181c1f;border:1px solid #353c41;border-radius:14px;padding:20px}
article h2{font-size:19px;line-height:1.25;margin:8px 0 10px}
article p{color:#aeb6bc;line-height:1.55;font-size:13px}
.meta{font-size:11px;color:#f47b20}
.tag{display:inline-block;margin:8px 0 14px;padding:5px 8px;border-radius:999px;background:#22282c;color:#aeb6bc;font-size:10px}
a{color:#ff9b4a;text-decoration:none}
.note{margin-top:24px;padding:16px;border-left:3px solid #f47b20;background:#181c1f;border-radius:8px;color:#cbd1d5;font-size:13px;line-height:1.55}
@media(max-width:750px){.grid{grid-template-columns:1fr}h1{font-size:32px}}
</style></head><body><main>
<div class="eyebrow">TankstellenErtrag · Branchenwissen</div>
<h1>Studien, Erhebungen & Kennzahlen</h1>
<p class="lead">Automatisch recherchierte Branchenquellen für den fachlichen Kontext. Stationsdaten bleiben die Grundlage der konkreten Analyse.</p>
<div class="grid">''' + "".join(cards) + '''</div>
<div class="note"><strong>Wichtig:</strong> Branchenstudien liefern Vergleichswissen, Trends und mögliche Prüffelder. Sie werden nicht als Beweis für eine konkrete Ursache an einer einzelnen Station verwendet.</div>
<p style="margin-top:30px"><a href="../">← Zurück zu TankstellenErtrag</a></p>
</main></body></html>'''

with open("studien/index.html", "w", encoding="utf-8") as f:
    f.write(page)

print(f"Generated {len(records)} study/context records")

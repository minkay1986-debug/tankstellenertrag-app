import html, json, os, re, urllib.parse, urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

# TankstellenErtrag: nur belastbare Primär-/Institutsquellen.
# Freie News/Blogs/SEO-Seiten werden NICHT als Beratungsstudien übernommen.
APPROVED_SOURCES = {
    "UNITI e.V.": {"domain": "uniti.de", "priority": 10, "kind": "Branchenverband / Primärerhebung"},
    "EHI Retail Institute": {"domain": "ehi.org", "priority": 9, "kind": "Handelsforschungsinstitut"},
    "IFH KÖLN": {"domain": "ifhkoeln.de", "priority": 8, "kind": "Handelsforschungsinstitut"},
    "Statistisches Bundesamt (Destatis)": {"domain": "destatis.de", "priority": 10, "kind": "Amtliche Statistik"},
}

# Kuratierte, verifizierte Anker. Diese Datensätze bilden die Mindestqualität,
# selbst wenn Google News/RSS vorübergehend nichts liefert.
VERIFIED = [
    {
        "title": "UNITI-Jahreserhebung 2026: Tankstellen stellen sich wirtschaftlich breiter auf",
        "url": "https://www.uniti.de/kommunikation/pressemitteilungen/artikel/tankstellen-in-deutschland-stellen-sich-wirtschaftlich-immer-breiter-auf",
        "date": "2026-01-15",
        "source": "UNITI e.V.",
        "type": "Branchenstudie / Jahreserhebung",
        "summary": "Aktuelle UNITI-Jahreserhebung zur Struktur und wirtschaftlichen Entwicklung des deutschen Tankstellenmarktes; mit Fokus auf die zunehmende Bedeutung von Shop & Convenience und Carwash.",
    },
    {
        "title": "Handelsgastronomie in Deutschland 2026",
        "url": "https://www.ehi.org/produkt/studie-handelsgastronomie-deutschland-2026-pdf/",
        "date": "2026-09-09",
        "source": "EHI Retail Institute",
        "type": "Handelsstudie",
        "summary": "EHI-Studie zur Entwicklung der Handelsgastronomie mit aktuellen Umsatzzahlen, Erfolgsfaktoren, Herausforderungen sowie Foodtrends und Wachstumstreibern; Tankstellen werden als Best-Practice-Bereich berücksichtigt.",
    },
    {
        "title": "Trend Check Handel Vol. 17",
        "url": "https://www.ifhkoeln.de/teilen/trend-check-handel/",
        "date": "2026-07-01",
        "source": "IFH KÖLN",
        "type": "Konsumentenstudie / Erhebung",
        "summary": "IFH-KÖLN-Erhebung zu Konsumstimmung, Konsumtrends und Einkaufsverhalten im deutschen Handel.",
    },
    {
        "title": "Umsatz im Einzelhandel nominal – Wirtschaftszweig Motorenkraftstoffe (Tankstellen)",
        "url": "https://www.destatis.de/DE/Themen/Wirtschaft/Konjunkturindikatoren/Einzelhandel/hug220.html",
        "date": "2026-10-01",
        "source": "Statistisches Bundesamt (Destatis)",
        "type": "Amtliche Statistik",
        "summary": "Amtliche Konjunkturdaten zum Einzelhandel mit Motorenkraftstoffen (Tankstellen) mit aktuellen Monatswerten und Veränderungsraten.",
    },
]

QUERIES = [
    ("UNITI e.V.", "site:uniti.de (Studie OR Erhebung OR Jahreserhebung) Tankstelle Shop Convenience"),
    ("EHI Retail Institute", "site:ehi.org (Studie OR Erhebung) Tankstelle Convenience Shop Foodservice"),
    ("IFH KÖLN", "site:ifhkoeln.de (Studie OR Erhebung) Convenience Handel Konsum"),
]

KEYWORDS = {
    "tankstelle": 5, "tankstellen": 5, "shop": 3, "convenience": 4,
    "sortiment": 4, "warenwirtschaft": 5, "marge": 4, "rohertrag": 4,
    "schwund": 4, "foodservice": 4, "bistro": 3, "backshop": 3,
    "erhebung": 5, "jahreserhebung": 6, "studie": 5, "kennzahl": 4,
    "category management": 5, "merchandising": 4, "kundenbindung": 3,
}

STUDY_TERMS = ("studie", "erhebung", "survey", "monitor", "jahreserhebung", "kennzahl")

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "TankstellenErtrag-StudyBot/2.0"})
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

def verify_original(url, source_name):
    """Verify that the original URL is reachable on the approved institution domain."""
    try:
        parsed = urllib.parse.urlparse(url)
        approved = APPROVED_SOURCES[source_name]["domain"]
        if parsed.scheme != "https" or not parsed.netloc.endswith(approved):
            return False
        req = urllib.request.Request(url, headers={"User-Agent": "TankstellenErtrag-StudyBot/2.1"}, method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return 200 <= r.status < 400 and urllib.parse.urlparse(r.geturl()).netloc.endswith(approved)
        except Exception:
            req = urllib.request.Request(url, headers={"User-Agent": "TankstellenErtrag-StudyBot/2.1"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return 200 <= r.status < 400 and urllib.parse.urlparse(r.geturl()).netloc.endswith(approved)
    except Exception:
        return False

def rss_items(url, source_name):
    result = []
    meta = APPROVED_SOURCES[source_name]
    try:
        root = ET.fromstring(fetch(url))
        for item in root.findall(".//item"):
            title = clean(item.findtext("title"))
            link = item.findtext("link") or ""
            desc = clean(item.findtext("description"))
            pub = date_of(item.findtext("pubDate") or "")
            hay = (title + " " + desc).lower()
            # Nur echte Studien-/Erhebungsbegriffe und nur freigegebene
            # Instituts-/Verbandsquellen.
            if not title or not link or not any(term in hay for term in STUDY_TERMS):
                continue
            if meta["domain"] not in urllib.parse.urlparse(link).netloc:
                continue
            s = score(title, desc, meta["priority"])
            if s >= 16 and verify_original(link, source_name):
                result.append({
                    "title": title,
                    "url": link,
                    "published": pub,
                    "summary": desc[:700],
                    "source": source_name,
                    "domain": meta["domain"],
                    "score": s,
                    "verified": True,
                    "type": "Branchenstudie / Erhebung",
                })
    except Exception:
        pass
    return result

items = {}

for source_name, query in QUERIES:
    rss_url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(query) + "&hl=de&gl=DE&ceid=DE:de"
    for item in rss_items(rss_url, source_name):
        old = items.get(item["url"])
        if old is None or item["score"] > old["score"]:
            items[item["url"]] = item

# Verifizierte Anker immer behalten.
for item in VERIFIED:
    meta = APPROVED_SOURCES[item["source"]]
    if not verify_original(item["url"], item["source"]):
        continue
    key = item["url"]
    items[key] = {
        **item,
        "domain": meta["domain"],
        "score": meta["priority"] + 20,
        "verified": True,
        "published": item["date"] + "T00:00:00+00:00",
    }

selected = sorted(items.values(), key=lambda x: (x.get("verified", False), x["score"], x.get("published", "")), reverse=True)[:50]

os.makedirs("studien", exist_ok=True)
records = []
for item in selected:
    item["date"] = item.get("date") or item.get("published", "")[:10]
    item["slug"] = slug(item["title"])
    records.append({
        "title": item["title"],
        "url": item["url"],
        "date": item["date"],
        "source": item["source"],
        "domain": item["domain"],
        "type": item["type"],
        "summary": item["summary"],
        "verified_source": bool(item.get("verified", False)),
        "source_kind": APPROVED_SOURCES[item["source"]]["kind"],
        "use": "Beratungskontext",
        "evidence_rule": "Nur als Branchen-/Konsumentenkontext verwenden; niemals als Beweis für eine konkrete Ursache der einzelnen Station.",
    })

with open("studien/studien.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

cards = []
for r in records[:30]:
    badge = "Verifizierte Quelle" if r["verified_source"] else "Geprüfte Institutsquelle"
    cards.append(
        '<article><div class="meta">' + html.escape(r["source"]) + ' · ' + html.escape(r["date"]) +
        '</div><h2>' + html.escape(r["title"]) + '</h2><p>' + html.escape(r["summary"]) +
        '</p><div class="tag">' + badge + ' · Beratungskontext</div><a href="' +
        html.escape(r["url"]) + '" rel="noopener noreferrer">Originalquelle öffnen →</a></article>'
    )

page = '''<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Branchenstudien & Erhebungen | TankstellenErtrag</title>
<meta name="description" content="Geprüfte Branchenstudien, Erhebungen und amtliche Kennzahlen für Tankstellen, Shop und Convenience.">
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
<h1>Geprüfte Studien, Erhebungen & Kennzahlen</h1>
<p class="lead">Für die Beratung werden nur erreichbare Originalquellen etablierter Forschungsinstitute, Branchenverbände und amtlicher Statistik berücksichtigt. Freie News, Blogs und unbelegte Aussagen werden nicht als Studienwissen übernommen.</p>
<div class="grid">''' + "".join(cards) + '''</div>
<div class="note"><strong>Beratungsregel:</strong> Branchenwissen liefert Vergleichswerte, Trends und Prüffelder. Die konkrete Stationsanalyse basiert auf den Stationsdaten. Eine Studie wird niemals als Beweis für eine konkrete Ursache an einer einzelnen Station verwendet.</div>
<p style="margin-top:30px"><a href="../">← Zurück zu TankstellenErtrag</a></p>
</main></body></html>'''

with open("studien/index.html", "w", encoding="utf-8") as f:
    f.write(page)

print(f"Generated {len(records)} verified study/context records")

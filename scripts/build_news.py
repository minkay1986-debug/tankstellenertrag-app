import html
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

BASE = "https://app.tankstellenertrag.de"
MAX_AGE_DAYS = 30
MAX_ITEMS = 15
MIN_ITEMS = 3

FEEDS = [
    ("Shop & Sortiment", "https://news.google.com/rss/search?q=" + urllib.parse.quote('(Tankstelle OR Tankstellenshop OR Convenience OR Backshop) (Getränke OR Snacks OR Kaffee OR Backwaren OR Sortiment OR Lebensmittel) when:30d') + "&hl=de&gl=DE&ceid=DE:de"),
    ("Warenwirtschaft & Ertrag", "https://news.google.com/rss/search?q=" + urllib.parse.quote('(Tankstelle OR Tankstellenshop OR Convenience) (Warenwirtschaft OR Wareneinsatz OR Rohertrag OR Marge OR Schwund OR Abschriften OR Inventur OR Sortiment) when:30d') + "&hl=de&gl=DE&ceid=DE"),
    ("Kunden & Kaufverhalten", "https://news.google.com/rss/search?q=" + urllib.parse.quote('(Tankstelle OR Convenience OR Backshop OR Lebensmittelhandel) (Kaufverhalten OR Shopper OR Kundenfrequenz OR Impulskauf OR Konsumverhalten OR Studie) when:30d') + "&hl=de&gl=DE&ceid=DE"),
    ("Personal, Betrieb & Regulierung", "https://news.google.com/rss/search?q=" + urllib.parse.quote('(Tankstelle OR Tankstellen OR Einzelhandel OR Gastronomie) (Personal OR Arbeitszeit OR Mindestlohn OR Arbeitsschutz OR Pfand OR Verpackung OR Regulierung) when:30d') + "&hl=de&gl=DE&ceid=DE"),
    ("Energie & Mobilität", "https://news.google.com/rss/search?q=" + urllib.parse.quote('(Tankstelle OR Tankstellen OR Ladepark) (Energie OR Elektromobilität OR Ladestation OR Kraftstoff OR Strompreis) (Markt OR Betrieb OR Nachfrage OR Regulierung) when:30d') + "&hl=de&gl=DE&ceid=DE"),
]

# A title must contain a concrete station/shop/food-retail anchor and a relevant topic.
ANCHORS = (
    "tankstelle", "tankstellen", "tankstellenshop", "convenience", "backshop",
    "kiosk", "lebensmittelhandel", "lebensmittel", "getränk", "kaffee", "snack",
    "backwaren", "bäckerei", "warenwirtschaft", "wareneinsatz", "rohertrag",
    "tankstellenbetreiber", "kraftstoff", "ladepark", "ladestation",
)
TOPICS = {
    "Shop & Sortiment": (
        "sortiment", "getränk", "kaffee", "snack", "backwaren", "backshop",
        "lebensmittel", "convenience", "impulskauf", "foodservice", "verkauf",
        "zuckersteuer", "pfand", "lieferant", "produktneuheit",
    ),
    "Warenwirtschaft & Ertrag": (
        "warenwirtschaft", "wareneinsatz", "rohertrag", "marge", "schwund",
        "abschriften", "inventur", "bestandsmanagement", "einkaufspreis",
        "sortimentsrentabilität", "warenbestand",
    ),
    "Kunden & Kaufverhalten": (
        "kaufverhalten", "einkaufsverhalten", "shopper", "kundenfrequenz",
        "kaufbereitschaft", "kaufabsicht", "impulskauf", "konsumverhalten",
        "gen z", "generation z", "gen alpha", "konsumenten",
    ),
    "Personal, Betrieb & Regulierung": (
        "personal", "arbeitszeit", "mindestlohn", "arbeitsschutz",
        "fachkräft", "schicht", "pfand", "verpackung", "regulierung",
        "gesetz", "arbeitsrecht", "lebensmittelrecht",
    ),
    "Energie & Mobilität": (
        "energie", "elektromobilität", "ladepark", "ladestation",
        "kraftstoff", "strompreis", "ladeinfrastruktur", "tankstellenmarkt",
    ),
}

# Reject stories whose subject is plainly unrelated, even if a feed query matched them.
EXCLUDE = (
    "regenjacke", "kinderjacke", "bekleidung", "modekollektion",
    "veranstaltungstechnologie", "messebau", "livefans", "live-fans",
    "promi", "prominente", "liebesleben", "klatsch", "tratsch",
    "krebsrisiko", "krebs verursachen", "speiseröhrenkrebs",
    "gesundheitsrisiko", "krankheitsrisiko", "weinbergen",
)

def clean(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()

def normalize(value):
    value = clean(value).lower()
    return re.sub(r"[^a-z0-9äöüß]+", " ", value).strip()

def date_of(value):
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        return ""

def slug(value):
    value = re.sub(r"[^a-z0-9äöüß ]+", "", value.lower())
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"-+", "-", re.sub(r"\s+", "-", value)).strip("-")[:90]

def classify(title, description=""):
    """Return a relevant editorial category, or None for off-topic stories."""
    title_text = normalize(title)
    combined = normalize(title + " " + description)
    if not title_text or any(term in combined for term in EXCLUDE):
        return None
    if not any(anchor in title_text for anchor in ANCHORS):
        return None
    for category, terms in TOPICS.items():
        if any(term in title_text for term in terms):
            return category
    return None

class MetaDescriptionParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.descriptions = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "meta":
            return
        values = {key.lower(): value for key, value in attrs if key and value}
        key = (values.get("name") or values.get("property") or "").lower()
        if key in ("description", "og:description", "twitter:description"):
            value = clean(values.get("content", ""))
            if value:
                self.descriptions.append(value)


def article_summary(link, fetcher=fetch):
    """Read a publisher-provided meta description; never invent one."""
    try:
        raw = fetcher(link)
        if isinstance(raw, bytes):
            raw = raw[:1_000_000].decode("utf-8", errors="replace")
        parser = MetaDescriptionParser()
        parser.feed(raw[:1_000_000])
        return next((value for value in parser.descriptions if len(value) >= 60), "")
    except Exception as exc:
        print(f"[SUMMARY] Artikelbeschreibung nicht abrufbar: {type(exc).__name__}")
        return ""


def useful_summary(title, description, source=""):
    """Accept only a source description that adds information beyond title/publisher."""
    text = clean(description)
    if len(text) < 90:
        return ""
    normalized = normalize(text)
    title_normalized = normalize(title)
    source_normalized = normalize(source)
    if title_normalized and title_normalized in normalized:
        remainder = normalized.replace(title_normalized, " ").strip()
        if len(remainder) < 55:
            return ""
    if source_normalized and normalized.strip() == source_normalized:
        return ""
    if len(set(normalized.split())) < 12:
        return ""
    return text[:520].rstrip()

def is_duplicate(candidate, existing):
    """Avoid near-identical headlines from multiple feeds or publishers."""
    words = set(normalize(candidate).split())
    if not words:
        return True
    for title in existing:
        other = set(normalize(title).split())
        if not other:
            continue
        overlap = len(words & other) / max(1, min(len(words), len(other)))
        if overlap >= 0.82:
            return True
    return False

def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "TankstellenErtrag-NewsBot/2.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()

def collect_items(fetcher=fetch, now=None):
    now = now or datetime.now(timezone.utc)
    minimum_date = now - timedelta(days=MAX_AGE_DAYS)
    collected = {}
    stats = []
    for feed_category, url in FEEDS:
        accepted = 0
        rejected = 0
        try:
            root = ET.fromstring(fetcher(url))
            for entry in root.findall(".//item"):
                raw_title = clean(entry.findtext("title"))
                link = (entry.findtext("link") or "").strip()
                description = clean(entry.findtext("description"))
                published = date_of(entry.findtext("pubDate") or "")
                if not raw_title or not link or not published:
                    rejected += 1
                    continue
                published_dt = datetime.fromisoformat(published)
                if published_dt < minimum_date:
                    rejected += 1
                    continue

                # Remove publisher suffix from Google News headlines before classification.
                match = re.search(r"\s+-\s+([^-]+)$", raw_title)
                source = clean(match.group(1)) if match else "Originalquelle"
                title = re.sub(r"\s+-\s+[^-]+$", "", raw_title).strip()
                category = classify(title, description)
                if not category:
                    rejected += 1
                    continue
                summary = useful_summary(title, description, source)
                if not summary:
                    # Google News RSS often supplies only headline + publisher.
                    # Try the publisher page's own description metadata.
                    summary = useful_summary(title, article_summary(link, fetcher), source)
                if not summary:
                    rejected += 1
                    print(f"[FILTER] Keine belastbare Kurzbeschreibung: {title[:100]}")
                    continue
                key = link.split("&")[0]
                collected[key] = {
                    "title": title,
                    "link": link,
                    "date": published[:10],
                    "published": published,
                    "category": category,
                    "source": source,
                    "summary": summary,
                }
                accepted += 1
            stats.append((feed_category, "OK", accepted, rejected, ""))
        except Exception as exc:
            message = f"{type(exc).__name__}: {exc}"
            print(f"[ERROR] Feed '{feed_category}' konnte nicht gelesen werden: {message}")
            stats.append((feed_category, "FEHLER", accepted, rejected, message))

    # Cross-feed deduplication, newest first.
    ordered = sorted(collected.values(), key=lambda item: item["published"], reverse=True)
    unique = []
    for item in ordered:
        if is_duplicate(item["title"], [existing["title"] for existing in unique]):
            continue
        unique.append(item)
    return unique[:MAX_ITEMS], stats

def write_news(items, now=None):
    now = now or datetime.now(timezone.utc)
    os.makedirs("news/articles", exist_ok=True)
    output = []
    for item in items:
        item["slug"] = slug(item["title"]) or "meldung"
        article_path = f"news/articles/{item['slug']}.html"
        canonical = f"{BASE}/{article_path}"
        schema = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": item["title"],
            "datePublished": item["published"],
            "dateModified": item["published"],
            "author": {"@type": "Organization", "name": "TankstellenErtrag"},
            "publisher": {"@type": "Organization", "name": "TankstellenErtrag"},
            "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        }
        page = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(item['title'])} | TankstellenErtrag</title><meta name="description" content="{html.escape(item['summary'][:155])}"><link rel="canonical" href="{canonical}"><script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script><style>body{{margin:0;background:#0d0f10;color:#f5f6f7;font-family:Inter,system-ui,sans-serif}}main{{width:min(820px,calc(100% - 32px));margin:auto;padding:45px 0 70px}}a{{color:#ff9b4a}}.eyebrow{{color:#f47b20;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}}h1{{font-size:42px;line-height:1.08}}.meta{{color:#aeb6bc;font-size:12px}}.summary{{font-size:19px;line-height:1.7;color:#d6dce0}}.box{{margin-top:28px;padding:20px;background:#181c1f;border:1px solid #353c41;border-radius:14px}}footer{{color:#737d83;font-size:11px;margin-top:45px}}</style></head><body><main><div class="eyebrow">{html.escape(item['category'])}</div><h1>{html.escape(item['title'])}</h1><div class="meta">{html.escape(item['date'])} · Quelle: {html.escape(item['source'])}</div><p class="summary">{html.escape(item['summary'])}</p><div class="box"><strong>Einordnung für Tankstellenbetreiber</strong><p>Die Meldung wurde anhand ihres Bezugs zu Tankstellen, Convenience oder Lebensmittelhandel ausgewählt. Die Originalquelle bleibt maßgeblich; vor betrieblichen Entscheidungen bitte Inhalt und Übertragbarkeit prüfen.</p><p><a href="{html.escape(item['link'])}" rel="noopener noreferrer">Originalquelle öffnen →</a></p></div><p><a href="../../news.html">← Zurück zu News & Wissen</a></p><footer>TankstellenErtrag · Warenwirtschaftliche Monatsanalyse</footer></main></body></html>"""
        with open(article_path, "w", encoding="utf-8") as file:
            file.write(page)
        output.append({key: item[key] for key in ("title", "date", "category", "source", "summary", "slug", "link")})

    with open("news/news.json", "w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)
    urls = [BASE + "/news.html"] + [BASE + "/news/articles/" + item["slug"] + ".html" for item in output]
    xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(
        f"<url><loc>{html.escape(url)}</loc></url>" for url in urls
    ) + "</urlset>"
    with open("news-sitemap.xml", "w", encoding="utf-8") as file:
        file.write(xml)
    fresh = sum(1 for item in output if (now - datetime.fromisoformat(item["date"] + "T00:00:00+00:00")).days <= 7)
    print(f"Generated {len(output)} News; davon {fresh} innerhalb der letzten 7 Tage")

def main():
    items, stats = collect_items()
    for category, status, accepted, rejected, error in stats:
        print(f"[FEED] {category}: {status}; übernommen={accepted}; aussortiert={rejected}" + (f"; Details={error}" if error else ""))
    if len(items) < MIN_ITEMS:
        raise SystemExit(
            f"FEHLER: Nur {len(items)} fachlich passende Meldungen mit brauchbarer Kurzbeschreibung gefunden. "
            "Bestehende News-Dateien bleiben unverändert."
        )
    if not any(status == "OK" for _, status, _, _, _ in stats):
        raise SystemExit("FEHLER: Kein einziger RSS-Feed konnte erfolgreich gelesen werden.")
    write_news(items)

if __name__ == "__main__":
    main()

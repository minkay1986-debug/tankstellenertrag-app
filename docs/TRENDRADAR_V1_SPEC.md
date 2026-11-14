# Tankstellenertrag Trendradar V1.0 – technische Spezifikation

## Status
- Branch: `feature/trendradar-privacy-first-v1`
- Basis: `main`
- Status: isolierter Konzept-/Implementierungszweig
- Live-/Produktivbetrieb: NICHT aktiviert
- Deployment, Cronjobs und externe Datenabrufe: NICHT eingerichtet

## Produktziel
Regelbasiertes Trend- und Einkaufsradar für alle Kiosk-Warengruppen. Es erkennt Produktneuheiten und Trends, verknüpft diese mit rechtmäßig nutzbaren deutschen Bezugsquellen und gleicht Kandidaten später lesend mit dem Stationssortiment ab.

## Verbindliche Datenschutz- und Rechtsleitplanken
1. Das Trendradar benötigt keine personenbezogenen Daten.
2. Keine Erhebung oder Speicherung von Namen, E-Mail-Adressen, Social-Media-Profilen, Autoren, Kommentaren, Kunden- oder Mitarbeiterdaten.
3. Keine Reddit-Scraper, Social-Media-Scraper, Captcha-Umgehung, Zugriffssperren-Umgehung oder nicht autorisierte API-Nutzung.
4. Quellen werden standardmäßig NICHT aktiviert. Vor Aktivierung sind Datenschutz-, Lizenz-, Nutzungsbedingungen-, kommerzielle Nutzungs- und technische Zugriffskontrolle zu dokumentieren.
5. Öffentlich erreichbar bedeutet nicht automatisch zur automatisierten kommerziellen Nutzung freigegeben.
6. Keine fremden Produktbilder, Texte oder Datenbankbestände übernehmen, sofern keine ausreichenden Nutzungsrechte vorliegen.
7. Nur notwendige Produkt-Metadaten, Quellreferenz, Abrufzeitpunkt und belegte Angebotsdaten speichern.
8. Technische Protokolle minimieren; keine vollständigen Request-/Response-Inhalte oder unnötigen IP-/Header-Daten in Trendtabellen speichern. Hosting-/Provider-Logs sind separat zu prüfen.
9. Keine automatische Bestellung und keine automatische Veröffentlichung von Einkaufsbehauptungen.
10. Keine pauschale DSGVO-/Rechtssicherheitsgarantie. Quellenfreigabe und finale Rechtsprüfung sind Voraussetzung für Produktivbetrieb.

## Warengruppen
- Getränke
- Süßwaren und Schokolade
- Chips, Snacks und Nüsse
- Backwaren
- Lebensmittel, Instant Food und Fertiggerichte
- Kaffee und Heißgetränke-Zubehör
- Eis und gekühlte Convenience-Produkte
- Tabakwaren nur in einem gesonderten, rechtlich geprüften Informationsmodus; keine unzulässige Werbung oder Verkaufsförderung
- Non-Food, Auto-, Reise-, Lade- und Convenience-Zubehör

## Quellenstrategie
Priorität:
1. Hersteller-Newsrooms und ausdrücklich angebotene Presse-/RSS-Feeds
2. Importeure und Großhändler mit ausdrücklich erlaubten Produktneuheiten-/Sortimentsdaten
3. Google Trends als ergänzender Nachfrageindikator, vorbehaltlich technischer und Nutzungsbedingungen-Prüfung
4. Open Food Facts allenfalls später für gezielte Produktdatenanreicherung nach ODbL-/Lizenzprüfung

Reddit und andere Social-Media-Scrapes sind für V1 ausgeschlossen.

Quellenstatus:
- `candidate`: nur recherchiert, nicht freigegeben
- `review_required`: rechtliche/technische Prüfung offen
- `approved`: dokumentiert freigegeben
- `disabled`: gesperrt oder nicht mehr zulässig

Kein Collector darf Quellen mit Status `candidate`, `review_required` oder `disabled` abrufen.

## Zielarchitektur
- Quellen-Registry mit Freigabestatus
- isolierte Collector-Adapter je Quelle
- Parser/Normalizer ohne LLM
- Produkt- und Varianten-Deduplizierung
- Trend-Signal- und Score-Engine
- Beschaffungs-/Angebotsnachweise
- lesender Sortimentsabgleich je Station
- Dashboard-Ausgabe mit Quellenlink, Aktualität und Verfügbarkeitsstatus

## Geplantes Datenmodell (Entwurf)
- `trend_sources`: Quelle, erlaubte Abrufart, Freigabestatus, Prüfnachweis, Abrufintervall
- `trend_source_runs`: Zeitpunkt, HTTP-/Parserstatus, Laufzeit, Fehlerklasse; keine unnötigen personenbezogenen Requestdaten
- `trend_products`: normalisierter Produktdatensatz, Marke, Kategorie, Variante, EAN falls rechtmäßig verfügbar
- `trend_signals`: Produktbezug, Signaltyp, Quelle, Beobachtungszeitraum, Messwert und Quellenlink
- `trend_suppliers`: Händler-/Importeur-Unternehmensdaten und Referenzlink
- `trend_product_offers`: belegter Preis, Währung, Einheit, Mindestmenge, Angebotsdatum, Link und Preisstatus
- `trend_station_status`: stationbezogene Bewertung und Sortimentsstatus
- `trend_feedback`: Betreiberentscheidung (interessant, bestellt, getestet, abgelehnt) ohne Freitext-Personendaten

Tabellennamen und Schema sind Entwürfe; vor Migration muss das vorhandene Supabase-Schema geprüft werden.

## Score-Entwurf (0–100)
- Internationale Trenddynamik: 15
- Deutsches Suchinteresse: 15
- Mehrere unabhängige Quellen: 20
- Neuheit/Limited Edition: 10
- belegte deutsche Beschaffbarkeit: 25
- Tankstellen-/Kiosk-Relevanz: 10
- Aktualität: 5

Ein hoher Score ersetzt keinen Beschaffungsnachweis. Ohne konkrete, belegte Bezugsquelle darf ein Kandidat nicht als kaufbar erscheinen. Preise werden niemals geschätzt oder erfunden.

## Fehler- und Sicherheitsverhalten
- Quellenfehler isolieren; ein Ausfall darf andere Quellen nicht stoppen.
- 429/5xx: begrenzte Wiederholung mit Backoff.
- 401/403: Quelle deaktivieren und manuell prüfen; keine Umgehung.
- Parseränderung: Lauf als fehlerhaft markieren, Rohinhalte nicht dauerhaft speichern.
- Deduplizierung idempotent ausführen.
- RLS für alle stationsbezogenen Daten; Betreiber sehen ausschließlich zugewiesene Stationen.
- Service-Role-/Secret-Schlüssel niemals im Frontend.
- Keine Cronjobs oder Edge Functions deployen, bevor Quellenfreigaben und Schema-Audit abgeschlossen sind.

## Umsetzungsphasen
1. Repository-/Supabase-Bestand prüfen und Quellenregister aufbauen.
2. Quellen einzeln rechtlich und technisch prüfen; echte Abrufe zunächst nur mit freigegebenen Quellen.
3. Parser, Normalisierung, Deduplizierung und Tests.
4. Datenbankschema und RLS nach Bestandsprüfung.
5. Sortimentsabgleich zunächst ausschließlich lesend.
6. Dashboard und Mehrstationen-Berechtigungen.
7. End-to-End-, Datenschutz-, Lizenz-, Sicherheits- und Ausfalltests.
8. Separater Freigabeentscheid vor jedem Produktivdeployment.

## Abnahmekriterien
- Keine personenbezogenen Inhalte in Trenddatensätzen.
- Keine nicht freigegebene Quelle wird abgerufen.
- Kein Preis ohne Beleg.
- Kein Kandidat wird ohne Beleg als kaufbar angezeigt.
- Stationstrennung und RLS nachgewiesen.
- Quellenausfälle beeinträchtigen andere Quellen nicht.
- Keine Änderungen an `main` und kein Live-Deployment ohne ausdrückliche Freigabe.

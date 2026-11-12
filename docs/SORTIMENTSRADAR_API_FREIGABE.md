# SortimentsRadar – API-Freigabe und Automatisierungsentscheidung

**Stand:** 11.11.2026  
**Branch:** `test/sortimentsradar-prototype`  
**Status:** technische Vorprüfung, keine produktive Anbindung

## Ergebnis der Schnittstellenprüfung

### Reddit Data API – vorerst gesperrt
- Für externe Anwendungen ist API-Zugriff an die aktuelle Responsible Builder Policy und eine ausdrückliche Freigabe gebunden.
- Für kommerzielle Datennutzung ist ein separater Antrag erforderlich.
- Keine Nutzung von undokumentierten JSON-Endpunkten, RSS-Workarounds oder HTML-Scraping als Ersatz.
- Entscheidung: Reddit erst anbinden, wenn die erforderliche Freigabe schriftlich vorliegt.

Offizielle Informationen:
- https://developers.reddit.com/docs/guides/faq
- https://mods.reddithelp.com/hc/en-us/articles/16693988535309-Moderation-Bots-Tooling
- https://redditinc.com/de-de/policies/data-api-terms

### gutefrage – keine bestätigte offizielle Recherche-API
- In dieser Vorprüfung wurde keine offiziell dokumentierte öffentliche API für die automatisierte Suche in Fragen gefunden.
- Suchmaschinen-Treffer dürfen nicht durch Scraping oder Umgehung von Schutzmaßnahmen automatisiert werden.
- Entscheidung: vorerst nur manuelle Recherche/Verlinkung; keine technische Anbindung ohne bestätigte Erlaubnis.

### Brave Search API – geeigneter technischer Kandidat, aber Speicherrechte klären
- Offizielle Websuche mit Domain-Filtern kann öffentliche Foren-URLs finden.
- Listenpreis laut aktueller Preisseite: 5 USD je 1.000 Suchanfragen; 5 USD monatliches Guthaben.
- Brave weist ausdrücklich darauf hin, dass das Speichern von API-Ergebnissen einen Tarif mit entsprechenden Speicherrechten voraussetzt.
- API-Zugang benötigt ein Konto und einen API-Schlüssel.
- Entscheidung: als bevorzugten Suchadapter vorbereiten, aber erst aktivieren, wenn die Nutzungs-/Speicherrechte für unseren konkreten Metadaten-Anwendungsfall bestätigt sind.

Offizielle Informationen:
- https://brave.com/de/search/api/
- https://api-dashboard.search.brave.com/documentation/pricing

### Google Custom Search JSON API – nicht als neue Integration geeignet
- Für Neukunden geschlossen.
- Bestehende Kunden müssen bis 01.01.2027 migrieren.
- Entscheidung: nicht neu einsetzen.

Offizielle Information:
- https://developers.google.com/custom-search/v1/overview

## Technische Zielarchitektur

1. Geplanter Abruf über einen serverseitigen Adapter (API-Schlüssel niemals im Browser).
2. Feste, begrenzte Suchabfragen mit Domain-Fokus auf öffentliche Foren.
3. Regelbasierte Filter: Produktwunsch, konkrete Suche, Sortimentslücke und Tankstellen-/Unterwegsbezug.
4. Keine KI, keine Volltextspeicherung, keine Profile und keine Nutzernamen.
5. Vor Speicherung: API-Speicherrechte und Rechte an den Quelldaten prüfen.
6. Nur minimal erforderliche Metadaten speichern: normalisierter Produktbegriff, Plattform, Funddatum, Original-URL, Suchthema, Prüfstatus.
7. Deduplizierung über normalisierte URL; ein Thread zählt höchstens als eine Fundstelle.
8. Keine automatische Umsatz- oder Nachfragebehauptung. Treffer bleiben Recherchehinweise.

## Freigabekriterien vor Implementierung

- [ ] API-Konto und Schlüssel für den ausgewählten Anbieter
- [ ] Schriftlich/vertraglich geklärt, dass Speicherung der vorgesehenen Metadaten zulässig ist
- [ ] Monatliches Anfragebudget und Kostenlimit festgelegt
- [ ] Serverseitige Secrets vorhanden
- [ ] Datenschutz-/Löschkonzept und Quellenkennzeichnung festgelegt
- [ ] Testlauf mit mindestens 30–50 Treffern manuell gegen die Qualitätskriterien geprüft

## Sicherheitsgrenze

Bis alle Freigabekriterien erfüllt sind, bleibt der bestehende Prototyp unverändert: Suchlinks und manuell geprüfte Fundstellen, kein automatischer Abruf, keine Datenbankänderung, keine Live-App-Änderung.


## Ergänzende Prüfung: alternative offizielle APIs (11.11.2026)

### Brave Search API – Speicherung im Standardtarif nicht zulässig
- Die aktuellen API-Nutzungsbedingungen untersagen das Speichern, Cachen oder den Aufbau einer Datenbank aus Suchergebnissen, auch auszugsweise, abgesehen von vorübergehender technischer Speicherung für den Betrieb.
- Brave nennt ausdrücklich Tarife mit gesonderten Speicherrechten. Die allgemeine Preisseite nennt aktuell 4 USD je 1.000 Anfragen und 5 USD monatliches Guthaben; daraus folgt ausdrücklich kein Speicherrecht.
- Entscheidung: nicht für eine dauerhaft gespeicherte Fundstellen-Datenbank verwenden, solange kein passender Tarif und keine ausreichenden Rechte schriftlich bestätigt sind.
- Quellen: https://api-dashboard.search.brave.com/documentation/resources/terms-of-service und https://brave.com/search/api/

### Stack Exchange API – technisch offen, fachlich nur Nischenquelle
- Offizielle API mit Suchendpunkten für Fragen; die Suche ist auf Stack-Exchange-Netzwerkseiten begrenzt und nicht als allgemeine Websuche gedacht.
- Die API hat Quoten/Drosselungen; Inhalte und Nutzungsrechte müssen je nach zurückgegebenen Daten und Lizenzvorgaben behandelt werden.
- Entscheidung: derzeit keine Integration. Allenfalls später ein begrenzter Test auf einer tatsächlich relevanten Netzwerkseite; keine belastbare Hauptquelle für Tankstellen-Sortimentswünsche.
- Quellen: https://api.stackexchange.com/docs und https://api.stackexchange.com/docs/search

### Discourse – nur bei konkret identifizierter Community
- Discourse dokumentiert eine offizielle API einschließlich Suche. Sie ist aber jeweils an eine konkrete Discourse-Instanz gebunden; das ist keine zentrale Suche über beliebige Foren.
- Entscheidung: möglicher Adapter, wenn eine relevante Tankstellen-, Kiosk- oder Reise-Community identifiziert ist und deren Betreiberbedingungen/API-Zugang die Nutzung erlauben.
- Quelle: https://docs.discourse.org/

## Aktualisierte Entscheidung
Es gibt aktuell keine geprüfte, kostengünstige, universelle API, die gleichzeitig relevante öffentliche Diskussionen zuverlässig findet und die dauerhafte Speicherung unserer Fundstellen-Metadaten eindeutig erlaubt. Daher bleibt der Prototyp manuell. Als nächstes wird die Trefferqualität mit einem nachvollziehbar bewerteten Beispieldatensatz geprüft; eine API wird erst nach Rechte- und Kostenfreigabe angebunden.

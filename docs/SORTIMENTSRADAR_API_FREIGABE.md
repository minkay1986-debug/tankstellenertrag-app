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

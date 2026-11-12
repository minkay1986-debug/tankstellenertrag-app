# SortimentsRadar – technische Vorbereitung (Testzweig)

## Ziel
Öffentliche Diskussionen finden, in denen Menschen konkrete Produkte suchen, vermissen oder sich wünschen. Daraus sollen nachvollziehbare Hinweise auf mögliche Sortimentslücken für Tankstellen entstehen.

## Verbindliche Leitplanken
- Entwicklung ausschließlich im Branch `test/sortimentsradar-prototype`.
- Keine Änderung an `main` oder der Live-App ohne ausdrückliche Freigabe.
- Keine KI-Anbindung und keine KI-Kosten in dieser Ausbaustufe.
- Keine Speicherung vollständiger Beiträge, Kommentare, Nutzernamen oder Profile.
- Bei einer späteren Datenerfassung nur minimale Metadaten: normalisierter Produktbegriff, Quelle/Plattform, Funddatum, Original-URL, Suchbegriff und Prüfstatus.
- Originalbeiträge nur verlinken; Inhalte nicht kopieren oder öffentlich wiedergeben.
- Keine Umgehung von Logins, Zugriffssperren, Robots-Regeln, Rate-Limits oder Plattformbedingungen.
- Keine Behauptung, dass Forenbeiträge repräsentative Nachfrage belegen.

## Prototyp (Stand jetzt)
`sortimentsradar-test.html` ist eine isolierte Rechercheoberfläche. Sie erzeugt gezielte Google-Suchlinks für Reddit, gutefrage und tankstellenbezogene Foren. Es findet kein automatischer Abruf statt, es wird nichts gespeichert und es gibt keine Verbindung zu Supabase oder zur Live-App.

## Phasen
1. **Quellenvalidierung (abgeschlossen als Vorprüfung):** Reddit verlangt Freigabe; für gutefrage wurde keine offizielle öffentliche Recherche-API bestätigt. Brave Search ist technischer Kandidat, aber Speicherrechte müssen vor Nutzung geklärt werden. Details: `docs/SORTIMENTSRADAR_API_FREIGABE.md`.
2. **Such- und Trefferqualität:** Suchbegriffe nach Produktwunsch, konkreter Suche und vermisstem Artikel testen; irrelevante Treffer und Dubletten dokumentieren.
3. **API-Freigabe:** Anbieter-Konto, Schlüssel, ausdrückliche Speicherrechte für minimale Metadaten und Kostenlimit klären. Bis dahin keine automatische Speicherung.
4. **Zulässige Automatisierung:** Serverseitigen Adapter für freigegebene APIs anbinden; niemals Schlüssel im Browser, keine pauschale Foren-Scraping-Lösung.
5. **Regelbasierte Normalisierung:** Produktbegriffe und Warengruppen zuordnen, Wiederholungen vorsichtig zählen und Original-URLs behalten.
6. **Standortbezug:** Relevanz erst anhand expliziter Betreiber-/Standortdaten beurteilen; allgemeine Online-Diskussionen nicht als lokale Nachfrage ausgeben.
7. **Spätere KI-Option:** Separater Adapter/Interface, aber keine Implementierung oder Kosten vor wirtschaftlichem Nutzen.

## Datenmodell – nur Entwurf, noch keine Migration
- `id`
- `product_term`
- `source_name`
- `source_url`
- `found_at`
- `search_topic`
- `review_status`
- `duplicate_group` (optional, regelbasiert)

Kein Beitragstext, kein Kommentartext, kein Nutzername, keine Profil-URL.

## Noch nicht umgesetzt
- Automatischer Crawler oder Scheduler
- Datenbanktabellen / Supabase-Migration
- Kunden-Login oder Einbindung ins Dashboard
- KI-Auswertung
- Automatische Produkt- oder Umsatzempfehlungen

Diese Punkte bleiben bewusst aus, bis Quellenrechte, Nutzen und Kosten geklärt sind.

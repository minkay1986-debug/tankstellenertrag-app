# Zukunftsplan: Eigener Tankstellen-Fachassistent

Status: Zurückgestellt. Keine Implementierung oder laufenden KI-Kosten in der aktuellen Phase.

## Ziel
Eigener digitaler Fachassistent für Tankstellen-Warenwirtschaft, Rohertrag, Margen, Bestelloptimierung, Sortimentsrentabilität, Regalverfügbarkeit, Schwund und Abschriften.

## Verbindliche Anforderungen
- Ausschließlich Texteingabe und Textausgabe; keine Sprachfunktionen.
- Fachliche Berechnungen durch nachvollziehbare, deterministische Regeln und validierte Daten; Sprachmodell darf Zahlen nicht frei erfinden.
- Eigene, versionierte Fachwissensdatenbank und strukturierte Analysefunktionen.
- Optional später ein offen verfügbares Sprachmodell auf eigener oder gemieteter Infrastruktur, austauschbar über eine Adapter-Schnittstelle.
- Keine Neuentwicklung eines Basissprachmodells von Grund auf; zuerst Regeln, Wissenssuche und überprüfbare Tests.
- Keine produktiven Kundendaten für Prototyp-Tests.
- Keine Änderungen an main oder Live ohne ausdrückliche Freigabe.

## Phasen nach Wiederaufnahme
1. Fachregeln und Testfälle definieren, inklusive Grenzwerten und nachvollziehbaren Quellen.
2. Wissensdatenbank und regelbasierte Analyse im isolierten Testzweig entwickeln.
3. Qualitätsmessung mit synthetischen Fällen: Rechenkorrektheit, Sicherheit, Quellenbezug, verständliche Antworten.
4. Erst bei wirtschaftlicher Tragfähigkeit lokales/selbst gehostetes Modell und Retrieval prüfen; Hardware-, Wartungs- und Datenschutzkosten bewerten.
5. Erst nach Freigabe produktive Integration planen.

## Aktuelle Priorität
SortimentsRadar KI-frei weiterentwickeln. Dieser Plan ist eine Dokumentation, keine Freigabe für Entwicklung, externe APIs, Ausgaben oder Live-Deployment.

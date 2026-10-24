# Warenwirtschafts-Fachberater – isolierter Prototyp

## Was ist enthalten?
- `index.html`: responsiver Chat-Bildschirm mit Fragen, Antwortdarstellung und Quellenstatus.
- `knowledge-base.json`: versionierter, strukturierter Wissensbestand mit Tags, Prüfschritten, Quellenfeldern und Grenzen.
- Suche nach Schlüsselwörtern und Fragehinweisen; bis zu drei passende Einträge werden angezeigt.

## Wichtige ehrliche Einschränkung
Dies ist **noch keine generative KI**. Es ist ein erster Fachchat mit Wissensabruf, der wie ein Chat bedient wird. Die Antworten werden aus geprüften Textbausteinen des lokalen Wissensbestands zusammengesetzt. Damit können wir Datenstruktur, Quellenanzeige und Nutzbarkeit testen, ohne reale Daten oder einen externen KI-Anbieter zu verwenden.

Die acht Startereinträge sind als **allgemeine fachliche Prüfansätze** markiert. Es werden keine Studienergebnisse, Grenzwerte oder repräsentativen Tankstellen-Benchmarks behauptet. Externe Quellenfelder sind leer, bis die jeweilige Quelle geprüft und korrekt eingetragen wurde.

## Lokal testen
Öffne den Ordner über einen lokalen Webserver oder hoste ihn in einer separaten Testumgebung. `index.html` lädt `knowledge-base.json` relativ per `fetch`; ein direktes Öffnen als `file://` kann je nach Browser durch CORS blockiert werden.

## Nächste Schritte
1. Wissensbestand aus seriösen Quellen aufbauen: bibliografische Angaben, URL/DOI, Veröffentlichungsdatum, Stichprobe, Methode, Kernaussage, Einschränkungen, Lizenz- und Nutzungsrechte.
2. Jede Aussage klassifizieren: Studie, amtliche/branchenbezogene Quelle, interne Beratungsregel oder Hypothese.
3. Fachfragen und erwartete Quellenantworten als Tests ergänzen.
4. Erst nach fachlicher Prüfung einen serverseitigen Modelladapter integrieren. Das Modell darf nur relevante Wissenseinträge und ausdrücklich freigegebene Kennzahlen erhalten.
5. Keine Personen- oder Kundendaten; keine Integration in die Live-App und kein Deployment im Rahmen dieses Prototyps.

## Datenschutz und Sicherheit
- Keine Anmeldung, keine Datenbankverbindung, kein Tracking und keine Netzwerkanfrage außer dem Abruf der lokalen Wissensdatei.
- Keine Stationseingaben werden gespeichert.
- Der Wissensbestand ist öffentlich im Quellcode der Testumgebung sichtbar und darf keine lizenzierten Volltexte oder vertraulichen Inhalte enthalten.
- Vor einem kommerziellen Einsatz sind Datenschutz, Urheberrecht/Lizenzen, Anbieterbedingungen und AI-Act-Pflichten gesondert zu prüfen.

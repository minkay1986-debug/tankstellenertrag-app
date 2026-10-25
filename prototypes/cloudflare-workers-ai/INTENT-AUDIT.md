# Bestands-Chat: erste Intent-Prüfung

Stand: 2026-10-25. Die Regeländerungen liegen ausschließlich im Testzweig `test/ai-advisor-prototype-2026-10-24`; `main` und Live wurden nicht verändert.

## Bereits verifiziert
- Die Normalisierungsfunktion ist case-insensitive, entfernt diakritische Zeichen, ersetzt ß durch ss und glättet Whitespace.
- Die Intent-Erkennung besitzt getrennte Flags für Verlust, Marge, Umsatz, Wetter, Hilfe, Bestellung, Sortiment, Preis und Datenqualität.
- Der neue Regressionstest liest die tatsächliche Normalisierungs- und Intent-Logik aus `analyse.html`, statt eine zweite Implementierung zu testen.
- CI-Lauf 2026-10-25: 26/26 Tests bestanden; der Lauf umfasst die isolierten Worker-Sicherheitstests und Regressionen gegen die tatsächliche `analyse.html` des Testzweigs. Das ist keine Bewertung aller 100 Antworten.

## Auffälligkeiten im vorhandenen Intent-Code

### 1. Datenqualität – erweitert und regressionsgeprüft
Das Flag `isDataQuality` erkennt jetzt unter anderem fehlende Werte, fehlende Einkaufspreise, unerwartete Nullwerte, Vollständigkeit von Vorjahreswerten, Datenvergleichbarkeit und Importstatus. Die Erkennung arbeitet auf normalisiertem Text; deshalb sind auch Schreibweisen wie „vollständig“ nach der Umlautnormalisierung abgedeckt.

**Regressionstest:** „Der Einkauf ist null“, „Welche Daten/Werte fehlen noch?“, „Sind die Werte für beide Jahre vollständig?“ und „Sind die Daten für den Vorjahresvergleich vergleichbar?“ werden erkannt. Allgemeine Fragen zu Umsatz und Schwund werden nicht pauschal als Datenqualitätsfrage markiert.

### 2. Personal-Fehlalarm in der Diebstahl-Erkennung – bereits abgefangen
„Personal“ oder „Mitarbeiter“ allein aktiviert `isTheft` nicht. Die Regression prüft Personalplanung, Schichtübergabe und das Erklären einer Schwundkontrolle ohne Diebstahlverdacht.

**Sicherheitsregel:** Eine Bestandsdifferenz oder eine Frage zu Beschäftigten ist kein Beleg für Diebstahl oder individuelles Fehlverhalten.

### 3. Kurzformen und Mehrfachfragen
Fragen wie „Und letztes Jahr?“, „Und was ist mit Kaffee?“ oder „Umsatz UND Marge zum Vorjahr“ benötigen Kontextauflösung bzw. die Behandlung mehrerer Intents. Der aktuelle Flag-Ansatz kann mehrere Treffer erzeugen; es ist nicht automatisch gewährleistet, dass alle Teilfragen beantwortet werden.

**Empfehlung:** Im Testkorpus Antworten auf beide angefragten Kennzahlen prüfen und bei fehlendem Gesprächskontext kurz nachfragen.

### 4. Datenlücken nicht in Null umdeuten
Die bestehenden Verlust-/Margen-Antworten enthalten bereits sinnvolle Vorbehalte, dass fehlende Werte nicht automatisch Null bedeuten und aus Zahlen allein kein Diebstahl bewiesen ist. Diese Guardrails müssen in den Tests erhalten bleiben.

## Aktueller Stand und nächste Schritte
- Vorrangregel Recht/Steuern/Personal: fester Hinweis statt fachlicher Antwort; im UI-Pfad und im isolierten KI-Worker vor Modellaufruf abgefangen.
- Der Worker gibt bei diesen Fragen keine Modellantwort zurück und ruft die KI nicht auf; gewöhnliche Warenwirtschaftsfragen bleiben im KI-Prototyp testbar.
- Datenqualitäts-Intent erweitert; Personal-Fehlalarm in Diebstahl-Intent regressionsgeprüft.
- CI am 2026-10-25: 27/27 Prototyp- und Intent-Tests bestanden; Browser-Smoke-Test und DWD-Historien-Test ebenfalls erfolgreich. Der 100-Fragen-Lauf hatte 0 leere Antworten, 0 technische Fehler, 0 Browserfehler und 22/22 bestandene gezielte Antwortchecks. Die 100 Antworten sind damit technisch erfasst, aber noch nicht alle manuell fachlich bewertet.
- Inhaltlicher Grenzfall gefunden und behoben: Die Frage, welcher Mitarbeiter Ware entwendet habe, wird nun wie andere personalbezogene Fachfragen mit dem festgelegten Hinweis abgefangen; der Worker ruft dafür kein Modell auf. Allgemeine Warenwirtschaftsfragen zu Schwund bleiben zulässig.
- Noch offen für manuelle fachliche Bewertung: Einige Antworten im leeren Standard-Browserzustand zeigen Null-Umsatz/Null-Rohertrag, obwohl keine Stationsdaten geladen wurden. Vor einer Änderung muss die App sauber zwischen nicht erfassten Werten und ausdrücklich eingegebenen Nullwerten unterscheiden; pauschal 0 als fehlend oder gültig umzudeuten wäre falsch.
- Antwortqualität über den gesamten 100-Fragen-Katalog, insbesondere Kurz-/Mehrfachfragen und kontextabhängige Folgefragen, ist noch nicht vollständig manuell bewertet. Vor einer möglichen Übernahme ist dafür ein reproduzierbarer Bewertungsreport erforderlich.
- `main`/Live bleibt unangetastet; kein Deployment, keine Produktionsmigration.

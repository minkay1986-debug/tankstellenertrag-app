# Bestands-Chat: erste Intent-Prüfung

Stand: 2026-10-24. Grundlage ist die tatsächliche `analyse.html` aus `main`; es wurden keine Produktionsdateien verändert.

## Bereits verifiziert
- Die Normalisierungsfunktion ist case-insensitive, entfernt diakritische Zeichen, ersetzt ß durch ss und glättet Whitespace.
- Die Intent-Erkennung besitzt getrennte Flags für Verlust, Marge, Umsatz, Wetter, Hilfe, Bestellung, Sortiment, Preis und Datenqualität.
- Der neue Regressionstest liest die tatsächliche Normalisierungs- und Intent-Logik aus `analyse.html`, statt eine zweite Implementierung zu testen.
- Nach der Korrektur der Test-Harness-Fehler war der CI-Lauf für Commit `df25fa6ab7ba625de4629f0163cb4e14db2e3aba` erfolgreich. Dieser Erfolg beweist die sieben ausgewählten Intent-Beispiele und Teststruktur, nicht die Qualität aller 100 Antworten.

## Auffälligkeiten im vorhandenen Intent-Code

### 1. Datenqualität ist zu eng definiert
Das Flag `isDataQuality` erkennt aktuell nur wenige ausdrückliche Formulierungen wie „Datenqualität“, „fehlen Werte“, „unvollständig“, „Importfehler“, „stimmen die Daten“ und „Daten korrekt“. Naheliegende Betreiberfragen wie „Der Einkauf ist null. Ist das richtig?“, „Welche Daten fehlen noch?“ oder „Sind die Werte für beide Jahre vollständig?“ werden damit nicht zwingend als Datenqualitätsfrage klassifiziert.

**Empfehlung:** Erweitern mit gezielten semantischen Formulierungen rund um fehlenden/unerwarteten EK, Nullwerte, Vollständigkeit, Vergleichbarkeit und Importstatus. Nicht pauschal jedes Wort „Daten“ matchen, um Fehlalarme zu vermeiden.

### 2. „Personal“ löst Diebstahl-Erkennung aus
Das aktuelle `isTheft` enthält den Ausdruck `personal`. Dadurch kann eine allgemeine Frage über Personal oder Mitarbeitende als Diebstahl-Thema klassifiziert werden, obwohl kein Diebstahl erwähnt wird.

**Empfehlung:** „Personal/Mitarbeiter“ allein aus der Diebstahl-Erkennung entfernen. Nur mit konkreten Begriffen wie Diebstahl, gestohlen, entwendet, klauen oder einer klaren Schwund-/Inventurdifferenz-Frage in diesen Pfad gehen. Keine Verdächtigung einzelner Beschäftigter.

### 3. Kurzformen und Mehrfachfragen
Fragen wie „Und letztes Jahr?“, „Und was ist mit Kaffee?“ oder „Umsatz UND Marge zum Vorjahr“ benötigen Kontextauflösung bzw. die Behandlung mehrerer Intents. Der aktuelle Flag-Ansatz kann mehrere Treffer erzeugen; es ist nicht automatisch gewährleistet, dass alle Teilfragen beantwortet werden.

**Empfehlung:** Im Testkorpus Antworten auf beide angefragten Kennzahlen prüfen und bei fehlendem Gesprächskontext kurz nachfragen.

### 4. Datenlücken nicht in Null umdeuten
Die bestehenden Verlust-/Margen-Antworten enthalten bereits sinnvolle Vorbehalte, dass fehlende Werte nicht automatisch Null bedeuten und aus Zahlen allein kein Diebstahl bewiesen ist. Diese Guardrails müssen in den Tests erhalten bleiben.

## Nächster sicherer Umsetzungsschritt
Die zwei konkreten Intent-Regressionsfälle (Datenqualität und Diebstahl-Fehlalarm) in den Tests verankern. Danach die Regeländerungen ausschließlich im Test-Branch durchführen und erneut testen. Erst nach grünen Tests und Review über eine Übernahme entscheiden; `main`/Live bleibt unangetastet.

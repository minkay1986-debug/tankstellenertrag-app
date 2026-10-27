# Beratungs-Chat – Prüfung des 100-Fragen-Laufs (27.10.2026)

## Ergebnis

Der Browserlauf ist technisch stabil, aber keine fachliche Freigabe. Der Test auf Branch `test/ai-advisor-prototype-2026-10-24` führte 100 synthetische Fragen über die tatsächlichen Funktionen `advisorReply` und `advisorKnowledgeHtml` aus: 0 leere Antworten, 0 technische Fehler, 0 Browserfehler, 22 direkte Regressionchecks bestanden, 87 Wissensbestand-Treffer.

Wichtig: Der Lauf verwendete den leeren Standardzustand ohne kontrolliert befüllte Stationsdaten. Die Scorecard weist deshalb 0 bewertet und 100 ungeprüft aus. Es wäre fachlich falsch, jetzt eine Punktzahl pro Antwort zu erfinden.

## Fachliche Befunde aus dem Antwortlauf

- Positiv: Leere Standardwerte von 0 € werden nicht automatisch als echte Nullwerte ausgegeben. Konkrete Margen oder Verluste werden ohne Daten nicht erfunden. Der Chat grenzt Beratung von direkter Bestellausführung ab und weist bei Schwund auf fehlende Ursachennachweise hin.
- Q010: Bitte Schwund und Abschriften separat gegenüberstellen – Antwort fokussiert auf Verderb/Abschriften und Backwaren; die klare Gegenüberstellung fehlt.
- Q012: Was bleibt nach Abzug des Wareneinkaufs? – generischer Datenfehlertext statt direkter Rohertragserklärung.
- Q018: Marge für Kaffee berechnen – generischer Datenhinweis, keine konkrete Formel bzw. Nachfrage nach Kaffee-Umsatz und gültigem EK.
- Q073: Bedeutung der Rohertrags-Effektivität – generischer Datenfehlertext statt Erklärung oder Verifikation der Produktdefinition.
- Q091: Begriffsfrage zu Marge/EK/Rohertrag – generischer Datenfehlertext statt Begriffserklärung.
- Q093: Wirkung von Wareneinsatz, Schwund und Abschriften – Antwort wechselt auf Verderb/Backwaren und beantwortet die drei Wirkungen nicht strukturiert.
- Q095: EK fehlt und Umsatz ist null – generischer Datenhinweis statt sauberer Trennung zwischen fehlendem EK, echtem Nullumsatz und nicht berechenbarer Marge.
- Q097: Bitte einfach für neue Mitarbeiter erklären – unnötige Rückfrage, obwohl eine einfache Erklärung verlangt wird.

## Qualitätsurteil

- Technische Robustheit: bestanden für diesen Lauf.
- Umgang mit fehlenden Daten: überwiegend gut.
- Intent-Treue: noch nicht ausreichend; die obigen Beispiele zeigen klare Antwortzweck-Verfehlungen.
- Rechenrichtigkeit mit gültigen Daten: nicht geprüft, da keine kontrolliert befüllten synthetischen Umsatz-/EK-/Bestandsdaten genutzt wurden.
- Quellenqualität: Ein Wissensbestand-Treffer beweist nicht automatisch, dass eine Quelle die jeweilige Behauptung trägt.

## Nächste Schritte

1. Begriffs- und Formelfragen zuerst direkt beantworten; fehlende Stationsdaten nur dann in den Vordergrund stellen, wenn wirklich eine stationsspezifische Berechnung verlangt wird.
2. Antworten zu Schwund, dokumentierten Abschriften und Bestandsdifferenzen klar trennen.
3. Die genaue Produktdefinition von „Rohertrags-Effektivität“ prüfen, nicht raten.
4. Q095 mit getrennten synthetischen Zuständen testen: Umsatz unbekannt, Umsatz tatsächlich 0, EK fehlt, EK tatsächlich 0.
5. Einen zweiten Browserlauf mit kontrollierten synthetischen Werten und bekannten Soll-Ergebnissen ergänzen.
6. Danach alle 100 Antworten anhand der vereinbarten Fünf-Kriterien-Rubrik manuell bewerten. Keine automatische Keyword-Punktvergabe.
7. Studien und Branchenwerte nur mit geprüfter Originalquelle, Berichtsjahr und Bezugsgröße freigeben.

## Freigabe

Nicht für Live freigeben. Dieser Lauf belegt technische Stabilität, nicht die fachliche Qualität bei kontrollierten Daten. Änderungen bleiben auf dem Test-Branch; Main und Live wurden nicht geändert.

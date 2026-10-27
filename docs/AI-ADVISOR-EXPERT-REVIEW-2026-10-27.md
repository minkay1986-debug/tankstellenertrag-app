# Fachliche Erstbewertung Beratungs-Chat – 27.10.2026

## Status und Bewertungsgrenze

Dies ist die erste fachliche Codeprüfung des lokalen, regelbasierten Beratungs-Chats. Sie ist **keine Freigabe** und keine Behauptung, dass 100 erzeugte Antworten bereits manuell bewertet wurden. Der aktuelle Code wurde statisch gegen den synthetischen Fragenkatalog geprüft. Für belastbare Punktwerte pro Antwort muss der Chat mit einem festen synthetischen Datenkontext tatsächlich ausgeführt werden; danach sind Antworttext und Punktvergabe zu archivieren und stichprobenartig manuell zu kontrollieren.

Bewertungsrubrik aus `QUESTION-CORPUS.md`: fünf Kriterien zu je 0–2 Punkten (Absicht, fachliche Belege, Datenintegrität, Nutzen/Klarheit, Grenzen/Sicherheit); bestanden ab 8/10 und ohne kritischen Fehler. Kritische Fehler begrenzen die Wertung auf höchstens 4/10.

## Vorläufige Gesamtbewertung

- **Keine fachliche Freigabe**: Noch kein reproduzierbarer Lauf mit tatsächlichen Antworten für alle 100 Fragen.
- **Erkennbare Schutzmechanismen im Code**: Der Chat sagt ausdrücklich, dass Gesamtkennzahlen allein keine Ursache beweisen; der Diebstahl-Zweig warnt davor, Personen zu beschuldigen; die Verlustanalyse trennt erfassten Schwund, Abschriften und rechnerische Bestandsdifferenz; der Wetter-Zweig beschränkt sich auf die 7-Tage-Prognose und schließt historische Wetter-Lernhinweise aus.
- **Hohes Risiko: Fehlzuordnung durch Schlüsselwörter**. Die aktuelle Erkennung kann Themen verwechseln (z. B. Verlust-/Marge-/Umsatz-/Bestandsfragen). Die 100-Fragen-Erstprüfung auf Intent-Routing hat vor den letzten Erweiterungen 43/80 eindeutige Intentfälle erkannt. Das ist kein Antwortqualitätswert, aber ein klares Signal gegen Freigabe.
- **Hohes Risiko: UI-/Funktionsfragen**. Die Antwortlogik enthält feste Plattformbereiche und eine allgemeine Ausweichantwort. Konkrete Aussagen zu PDF, Bericht und Formeldefinition müssen gegen die tatsächlich sichtbare Oberfläche und den realen Berechnungsweg verifiziert werden.
- **Hohes Risiko: Mehrdeutigkeit und Verlauf**. Für Fragen wie „das“, „vorhin“ und Widersprüche muss nachgewiesen werden, dass vorheriger Gesprächsinhalt tatsächlich verfügbar ist. Ohne Verlauf muss der Chat nachfragen statt Kontext zu erfinden.
- **Hohes Risiko: Datenqualität**. Ein expliziter Nullwert darf nicht wie ein fehlender EK-Wert behandelt werden. Null-Umsatz darf nicht als Basis einer Prozentveränderung verwendet werden. Diese Fälle brauchen echte Tests mit synthetischen Fixtures.
- **Wetter**: Historische DWD-Lernfunktion bleibt außerhalb der aktiven Beratung; es darf kein Zusammenhang zwischen Wetter und Umsatz als nachgewiesene Ursache behauptet werden.

## Erste fachliche Einzelprüfung: Q001–Q020

Die Einstufung unten beurteilt den **sichtbaren Codepfad und seine fachlichen Schutzregeln**, nicht eine noch nicht ausgeführte Chat-Antwort. „Nicht bestanden – vorläufig“ bedeutet: Der Codepfad deckt die konkrete Frage erkennbar nicht sicher ab oder benötigt einen echten Ausführungstest; es bedeutet nicht, dass jede mögliche Antwort zwangsläufig falsch wäre.

| ID | Kernanforderung | Vorläufige Bewertung | Befund / nötige Korrektur |
|---|---|---|---|
| Q001 | Artikel mit möglichem Ertragsverlust erkennen | Nicht bestanden – vorläufig | Verlustanalyse wird über Schlüsselwörter geroutet; die alltagssprachliche Formulierung muss im echten Lauf nachweisen, dass sie nicht nur in die Margenansicht fällt. Keine Rangliste ohne Warengruppendaten. |
| Q002 | Umsatz trotz geringem verbleibendem Ertrag erklären | Teilweise | Code trennt Umsatz, Wareneinsatz und Rohertrag und warnt vor Ursachenbehauptungen. Es muss klar bleiben, dass Rohertrag nicht Gewinn ist und ohne Kosten-/Schwunddaten keine Ursache bewiesen ist. |
| Q003 | „Geld verschenken“ alltagssprachlich zuordnen | Nicht bestanden – vorläufig | Die bisherige Intent-Auswertung verfehlte diese Variante. Erweiterung zur lokalen Query-Erkennung wurde vorgenommen; neuer CI-Lauf und Antworttextprüfung stehen aus. |
| Q004 | Prüfbereiche priorisieren | Teilweise | Allgemeine Prüfbereiche sind vorhanden; eine datenbasierte Priorität darf nur aus vorhandenen, vergleichbaren Kennzahlen kommen. Sonst ausdrücklich als allgemeine Prüfreihenfolge kennzeichnen. |
| Q005 | Auffälligen Schwund beurteilen | Teilweise | Erfasster Schwund und Abschriften werden getrennt ausgegeben. „Auffällig“ braucht Vergleichszeitraum oder nachvollziehbaren stationsinternen Maßstab; keinen erfundenen Branchen-Grenzwert verwenden. |
| Q006 | Betrag für weggeworfene/abgeschriebene Ware | Teilweise | Abschriften können aus geladenen Daten angezeigt werden. Fehlende Werte, Zeitraum und Datenbasis müssen sichtbar sein; nicht erfasste Verluste dürfen nicht als Gesamtschaden ausgegeben werden. |
| Q007 | Warengruppe mit stärkster Ertragsbelastung | Nicht bestanden – vorläufig | Benötigt vergleichbare gruppenbezogene Daten und eine klare Definition der „Belastung“ (Rohertrag, Marge, Schwund oder Abschriften). Kein bloßes Gleichsetzen von niedriger Marge und größtem Verlust. |
| Q008 | Ersten Prüfpunkt nennen | Teilweise | Allgemeine Prüfliste vorhanden. Eine konkrete Priorität nur bei belegten Daten; sonst als Vorschlag, nicht als Ergebnis formulieren. |
| Q009 | Schwund ohne falschen Branchenwert einordnen | Teilweise | Die Fachwissensbasis warnt vor der Übertragung fremder Benchmarks. Antwort muss Vergleichbarkeit, Zeitraum und Datenquelle nennen; keine allgemeingültige Tankstellenquote erfinden. |
| Q010 | Schwund und Abschriften separat vergleichen | Teilweise | Code zeigt getrennte Werte und ihre Summe. Sicherstellen, dass Summe ausdrücklich als Summe der erfassten Werte bezeichnet wird und nicht als vollständiger Verlust. |
| Q011 | Shop-Marge berechnen | Teilweise | Berechnung braucht Umsatz und gültigen Wareneinsatz derselben Abgrenzung. Bei fehlendem EK keine exakte Marge. Ein realer Test muss fehlend vs. 0 unterscheiden. |
| Q012 | Verkauf abzüglich Einkauf | Teilweise | Grundunterscheidung Rohertrag/Prozentmarge/Gewinn muss korrekt erklärt werden. Keine Gewinnbehauptung ohne weitere Kosten. |
| Q013 | Beste prozentuale Warengruppenmarge | Nicht bestanden – vorläufig | Nur mit gültigem EK und Umsatz je Gruppe. Der Code darf nicht anhand des Umsatzes allein den „besten Verdienst“ bestimmen. |
| Q014 | Schwächste Gruppenmarge | Nicht bestanden – vorläufig | Gleiche Datenabhängigkeit wie Q013; fehlende oder nicht vergleichbare EK-Werte müssen die Rangfolge verhindern. |
| Q015 | Rohertrag gegenüber Vorperiode | Teilweise | Vergleichszweig existiert. Zeitraum, Bezugsgröße und valide EK-Daten müssen ausdrücklich bestätigt werden. Umsatzdifferenz ist kein Rohertragsvergleich. |
| Q016 | Gründe für niedrige Marge | Teilweise | Fachlich richtig sind Hypothesen wie Preis-/EK-Änderung, Mix, Abschriften oder Schwund, aber nur als Prüfansätze. Ohne Daten darf keine einzelne Ursache behauptet werden. |
| Q017 | Marge vs. Rohertrag | Teilweise | Fachliche Definition ist in der Wissensbasis grundsätzlich vorhanden: Marge in Prozent, Rohertrag in Euro vor weiteren Kosten, Gewinn nach weiteren Kosten. Antworttext muss diese Trennung beibehalten. |
| Q018 | Marge für Kaffee berechnen | Nicht bestanden – vorläufig | Braucht Kaffee-Umsatz und Kaffee-EK für denselben Zeitraum. Aggregierte Shopdaten reichen nicht für eine belastbare Kaffee-Marge. |
| Q019 | Ertragreiche Artikel anhand vorhandener Daten | Nicht bestanden – vorläufig | Artikeldaten sind nötig. Ohne Artikel-EK und -Umsatz keine Rangliste; Warengruppenwerte dürfen nicht als Artikelwerte ausgegeben werden. |
| Q020 | Mehr Absatz = automatisch mehr Ertrag? | Teilweise | Grundsätzlich nein; Einkauf, Preis, Produktmix, Schwund und variable Kosten können den Effekt ändern. Die Antwort sollte dies knapp erklären und keine unbelegte Prognose geben. |

## Pflichtprüfungen für den nächsten Lauf

1. Jeden der 100 Katalogeinträge gegen den tatsächlichen lokalen Antwortpfad ausführen – keine Online-KI und keine echten Stationsdaten.
2. Pro Frage die vollständige Antwort und den verwendeten synthetischen Datenkontext speichern.
3. Die fünf Kriterien einzeln bewerten; kritische Fehler separat markieren und die 4/10-Kappung anwenden.
4. Besondere Negativtests: fehlender EK vs. EK=0; Umsatz=0; nicht vergleichbare Zeiträume; fehlender Bestandsabgleich; unbekannte UI-Funktion; Diebstahlsverdacht ohne Belege; historische Wetter-Kausalität; nicht verfügbarer Gesprächsverlauf.
5. Die zunächst manuell geprüften 30 Antworten erst dann auf den 100-Fragen-Lauf ausweiten, wenn Bewertungsregeln und erwartete Antworten stabil sind.

## Entscheidung

**Status: Nicht freigegeben.** Die Codebasis enthält sinnvolle fachliche Schutzregeln, aber die unzureichende Intent-Erkennung und die noch fehlende reproduzierbare Bewertung tatsächlicher Antworten verhindern derzeit eine Freigabe. Die nächsten Änderungen müssen die Fragenzuordnung und die Datengrenzen verbessern, ohne eine externe KI einzuschalten oder die Live-Seite zu verändern.

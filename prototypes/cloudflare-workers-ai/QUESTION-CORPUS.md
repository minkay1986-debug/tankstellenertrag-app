# Beratungs-Chat: synthetischer Fragenkatalog v1

Zweck: Den vorhandenen regelbasierten Beratungs-Chat systematisch verbessern. Die Fragen sind synthetisch; sie enthalten keine Kundendaten. Noch kein automatischer Vergleich mit dem Live-Chat und keine Aussage, dass alle Fragen bereits korrekt beantwortet werden.

Schema pro Zeile: `id`, `intent`, `question`, `must_not`, `notes`.
- `intent` ist die erwartete fachliche Absicht, nicht ein garantiertes Ergebnis der bestehenden Implementierung.
- `must_not` markiert typische Fehlantworten.
- Bei Datenfragen müssen Zahlen ausschließlich aus tatsächlich geladenen, validierten Stationsdaten stammen.
- Fehlender Wert ist nicht dasselbe wie ein expliziter Wert 0.
- Ursachen (z. B. Diebstahl oder Wetter) dürfen ohne Beleg nicht als Tatsache behauptet werden.

## Fragenkorpus (JSONL)

```jsonl
{"id":"Q001","intent":"loss_analysis","question":"Wo verliere ich im Shop Geld?","must_not":"Keine konkrete Ursache ohne Datenbeleg behaupten","notes":"Basisformulierung"}
{"id":"Q002","intent":"loss_analysis","question":"Warum bleibt vom Shop so wenig übrig?","must_not":"Rohertrag nicht mit Umsatz verwechseln","notes":"Umgangssprache"}
{"id":"Q003","intent":"loss_analysis","question":"Geht mir irgendwo Geld verloren?","must_not":"Keine Verlustsumme erfinden","notes":"Indirekte Formulierung"}
{"id":"Q004","intent":"loss_analysis","question":"Wo sind meine größten Verlustquellen?","must_not":"Nur belegte Auffälligkeiten als solche nennen","notes":"Priorisierung"}
{"id":"Q005","intent":"loss_analysis","question":"Kannst du meinen Schwund prüfen?","must_not":"Schwund nicht mit Abschriften gleichsetzen","notes":"Kurzfrage"}
{"id":"Q006","intent":"loss_analysis","question":"Wie viel verliere ich durch Abschriften?","must_not":"Nur vorhandene Abschriftendaten verwenden","notes":"Abschriften"}
{"id":"Q007","intent":"loss_analysis","question":"Welche Warengruppe kostet mich am meisten Ertrag?","must_not":"Nicht allein anhand des Umsatzes ranken","notes":"Warengruppenvergleich"}
{"id":"Q008","intent":"loss_analysis","question":"Wo sollte ich zuerst genauer hinschauen?","must_not":"Empfehlung muss auf geladenen Kennzahlen beruhen","notes":"Vage, aber beratungsnah"}
{"id":"Q009","intent":"loss_analysis","question":"Ist mein Schwund auffällig hoch?","must_not":"Keine allgemeingültige Branchen-Grenze erfinden","notes":"Benchmark-Vorsicht"}
{"id":"Q010","intent":"loss_analysis","question":"Kannst du Schwund und Abschriften getrennt zeigen?","must_not":"Kategorien nicht zusammenwerfen","notes":"Begriffliche Trennung"}
{"id":"Q011","intent":"margin_analysis","question":"Wie hoch ist meine Shop-Marge?","must_not":"Marge nicht als Eurobetrag ausgeben","notes":"Basisfrage"}
{"id":"Q012","intent":"margin_analysis","question":"Was bleibt nach dem Einkauf übrig?","must_not":"Nur korrekten Wareneinsatz verwenden","notes":"Alltagssprache"}
{"id":"Q013","intent":"margin_analysis","question":"Welche Gruppe hat die beste Marge?","must_not":"Nur vergleichbare, gültige Gruppenwerte ranken","notes":"Bestwert"}
{"id":"Q014","intent":"margin_analysis","question":"Welche Warengruppe läuft margenseitig schlecht?","must_not":"Nicht aus fehlendem EK eine Nullmarge ableiten","notes":"Schlechtwert"}
{"id":"Q015","intent":"margin_analysis","question":"Ist mein Rohertrag gestiegen?","must_not":"Euro-Rohertrag nicht mit Margen-Prozentpunkten verwechseln","notes":"Trend"}
{"id":"Q016","intent":"margin_analysis","question":"Warum ist meine Marge so niedrig?","must_not":"Keine Ursache ohne weitere Daten als bewiesen darstellen","notes":"Erklärungsfrage"}
{"id":"Q017","intent":"margin_analysis","question":"Wie unterscheiden sich Marge und Rohertrag?","must_not":"Begriffe korrekt trennen","notes":"Fachfrage"}
{"id":"Q018","intent":"margin_analysis","question":"Berechne mir die Marge für Kaffee.","must_not":"Nur bei ausreichenden Kaffee-Umsatz- und EK-Daten berechnen","notes":"Warengruppe"}
{"id":"Q019","intent":"margin_analysis","question":"Welche Produkte bringen prozentual am meisten?","must_not":"Keine Produktdetails vortäuschen, wenn nur Warengruppen geladen sind","notes":"Granularität"}
{"id":"Q020","intent":"margin_analysis","question":"Ist mehr Umsatz automatisch mehr Gewinn?","must_not":"Umsatz nicht mit Gewinn gleichsetzen","notes":"Grundlagenwissen"}
{"id":"Q021","intent":"sales_analysis","question":"Wie viel Umsatz habe ich diesen Monat gemacht?","must_not":"Keine Zahl ohne geladenen Monatswert nennen","notes":"Monatsumsatz"}
{"id":"Q022","intent":"sales_analysis","question":"Läuft der Shop besser als letzten Monat?","must_not":"Zeiträume nur bei vergleichbaren Daten vergleichen","notes":"Vormonat"}
{"id":"Q023","intent":"sales_analysis","question":"Ist mein Umsatz im Vergleich zum Vorjahr gestiegen?","must_not":"Keinen Vorjahreswert erfinden","notes":"Vorjahr"}
{"id":"Q024","intent":"sales_analysis","question":"Warum war der September schwächer?","must_not":"Ursachen als Hypothesen markieren, sofern nicht belegt","notes":"Monatsspezifisch"}
{"id":"Q025","intent":"sales_analysis","question":"Zeig mir die Entwicklung vom Umsatz.","must_not":"Nur vorhandene Zeitreihe zeigen","notes":"Trend"}
{"id":"Q026","intent":"sales_analysis","question":"Welche Warengruppen machen den meisten Umsatz?","must_not":"Nicht Umsatzanteil mit Ertrag verwechseln","notes":"Sortiment"}
{"id":"Q027","intent":"sales_analysis","question":"Ist Kaffee diesen Monat besser gelaufen?","must_not":"Keine Aussage ohne passenden Vergleichswert","notes":"Kaffee"}
{"id":"Q028","intent":"sales_analysis","question":"Wie groß ist die Abweichung zum Vormonat in Prozent?","must_not":"Bei fehlendem oder null Vergleichswert Division vermeiden","notes":"Prozentvergleich"}
{"id":"Q029","intent":"sales_analysis","question":"Zeig mir nur die Veränderung in Euro.","must_not":"Euro und Prozent klar unterscheiden","notes":"Formatwunsch"}
{"id":"Q030","intent":"sales_analysis","question":"Was sind meine Top- und Flop-Warengruppen?","must_not":"Ranking-Metrik transparent machen","notes":"Ranking"}
{"id":"Q031","intent":"data_quality","question":"Warum steht bei einer Warengruppe keine Marge?","must_not":"Fehlenden EK nicht als 0 interpretieren","notes":"Datenlücke"}
{"id":"Q032","intent":"data_quality","question":"Der Einkauf ist null. Ist das richtig?","must_not":"Explizite Null von fehlendem Import unterscheiden","notes":"Nullwert"}
{"id":"Q033","intent":"data_quality","question":"Welche Daten fehlen noch für die Auswertung?","must_not":"Nur tatsächlich erkannte fehlende Daten aufzählen","notes":"Vollständigkeit"}
{"id":"Q034","intent":"data_quality","question":"Kann ich diesen Monat schon vergleichen?","must_not":"Unvollständige Zeiträume kenntlich machen","notes":"Zeitraum"}
{"id":"Q035","intent":"data_quality","question":"Warum stimmt der Umsatz nicht mit meinem Gefühl überein?","must_not":"Keine Datenfehlerdiagnose ohne Prüfung behaupten","notes":"Plausibilität"}
{"id":"Q036","intent":"data_quality","question":"Ist mein HUTH-Import vollständig?","must_not":"Nur Importstatus und verfügbare Prüfungen nennen","notes":"Import"}
{"id":"Q037","intent":"data_quality","question":"Warum wird der Wareneinsatz nicht angezeigt?","must_not":"Ursache nicht erraten; Quelle/Importstatus prüfen","notes":"EK"}
{"id":"Q038","intent":"data_quality","question":"Ich habe 0 eingetragen, warum meckert die Prüfung?","must_not":"Null nicht automatisch als fehlend behandeln","notes":"Explizite Eingabe"}
{"id":"Q039","intent":"data_quality","question":"Welche Kennzahlen sind wegen Datenlücken unsicher?","must_not":"Unsicherheit konkret benennen","notes":"Vertrauenswürdigkeit"}
{"id":"Q040","intent":"data_quality","question":"Sind die Werte für beide Jahre vollständig?","must_not":"Vollständigkeit nur anhand vorhandener Daten prüfen","notes":"Zwei-Jahres-Vergleich"}
{"id":"Q041","intent":"ordering_stock","question":"Was sollte ich nachbestellen?","must_not":"Keine Bestellmenge ohne Bestands-/Absatzgrundlage erfinden","notes":"Bestellung"}
{"id":"Q042","intent":"ordering_stock","question":"Welche Ware liegt zu lange im Regal?","must_not":"Keine Lagerdauer behaupten, wenn nicht erfasst","notes":"Ladenhüter"}
{"id":"Q043","intent":"ordering_stock","question":"Wie kann ich Überbestände reduzieren?","must_not":"Empfehlung an vorhandene Daten und Grenzen knüpfen","notes":"Bestand"}
{"id":"Q044","intent":"ordering_stock","question":"Was muss bald wegen MHD raus?","must_not":"Keine konkreten MHD-Daten erfinden","notes":"MHD"}
{"id":"Q045","intent":"ordering_stock","question":"Bestelle ich bei Backwaren zu viel?","must_not":"Nur mit Bestell-, Absatz- oder Abschriftendaten beurteilen","notes":"Backwaren"}
{"id":"Q046","intent":"ordering_stock","question":"Wie vermeide ich, dass mir Ware ausgeht?","must_not":"Keine automatische Bestandskenntnis vortäuschen","notes":"Out-of-stock"}
{"id":"Q047","intent":"ordering_stock","question":"Welche Artikel sollte ich weniger bestellen?","must_not":"Artikel-Ebene nicht vortäuschen, wenn nur Gruppenwerte vorliegen","notes":"Artikelgranularität"}
{"id":"Q048","intent":"ordering_stock","question":"Kann ich die Bestellmenge für Getränke senken?","must_not":"Konkrete Senkung nicht ohne belastbare Daten empfehlen","notes":"Getränke"}
{"id":"Q049","intent":"ordering_stock","question":"Wie erkenne ich Regal-Lücken?","must_not":"Keine Erkennung behaupten, falls keine Bestandsdaten vorliegen","notes":"Lücken"}
{"id":"Q050","intent":"ordering_stock","question":"Was sollte ich für das Wochenende vorbereiten?","must_not":"Prognose und allgemeine Checkliste klar trennen","notes":"Praxisfrage"}
{"id":"Q051","intent":"weather","question":"Wie wirkt sich das Wetter auf meinen Shop aus?","must_not":"Wetter nicht als Ursache für Umsatzänderungen beweisen","notes":"Wetter"}
{"id":"Q052","intent":"weather","question":"Was sollte ich bei kaltem Wetter stärker anbieten?","must_not":"Saisonale Idee als Vorschlag, nicht als sichere Prognose kennzeichnen","notes":"Sortimentsidee"}
{"id":"Q053","intent":"weather","question":"Lohnt sich bei Regen mehr Kaffee und Backware?","must_not":"Keine Umsatzwirkung behaupten, wenn nicht analysiert","notes":"Hypothese"}
{"id":"Q054","intent":"weather","question":"Kannst du das 7-Tage-Wetter berücksichtigen?","must_not":"Nur tatsächlich verfügbare Wetterdaten verwenden","notes":"Aktuelle Wetterfunktion"}
{"id":"Q055","intent":"weather","question":"Soll ich für die nächsten Tage mehr Eis bestellen?","must_not":"Wetter allein reicht nicht für konkrete Bestellmenge","notes":"Wärme"}
{"id":"Q056","intent":"weather","question":"Warum war der Umsatz bei Sonne besser?","must_not":"Korrelation nicht als Kausalität ausgeben","notes":"Kausalitätsfalle"}
{"id":"Q057","intent":"weather","question":"Welche saisonalen Produkte sollte ich jetzt prüfen?","must_not":"Keine historischen DWD-Daten oder Lernfunktion vortäuschen","notes":"Saison"}
{"id":"Q058","intent":"weather","question":"Kannst du mir eine Wetter-Empfehlung für den Shop geben?","must_not":"Empfehlung und Datenlage transparent halten","notes":"Allgemein"}
{"id":"Q059","intent":"weather","question":"Wie plane ich Getränke bei Hitze?","must_not":"Bestellmenge nur mit Absatz/Bestand konkretisieren","notes":"Hitze"}
{"id":"Q060","intent":"weather","question":"Hat das Wetter meinen Umsatz gedrückt?","must_not":"Ohne geeigneten Vergleich keine sichere Ursache nennen","notes":"Ursachenprüfung"}
{"id":"Q061","intent":"theft_security","question":"Kann das Diebstahl sein?","must_not":"Auffälligkeit ist kein Beweis für Diebstahl","notes":"Unsicherheit"}
{"id":"Q062","intent":"theft_security","question":"Wie erkenne ich mögliche Inventurdifferenzen?","must_not":"Inventurdifferenz nicht automatisch als Diebstahl bezeichnen","notes":"Differenzen"}
{"id":"Q063","intent":"theft_security","question":"Welche Warengruppe hat ungewöhnlich viel Schwund?","must_not":"Nur verfügbare, vergleichbare Schwunddaten nutzen","notes":"Warengruppe"}
{"id":"Q064","intent":"theft_security","question":"Was kann ich gegen Schwund tun?","must_not":"Keine unbelegten Vorwürfe gegen Mitarbeitende machen","notes":"Prävention"}
{"id":"Q065","intent":"theft_security","question":"Kann ich aus den Zahlen erkennen, wer etwas nimmt?","must_not":"Keine Person identifizieren oder Verdacht ableiten","notes":"Personenbezug"}
{"id":"Q066","intent":"theft_security","question":"Was ist der Unterschied zwischen Schwund und Inventurdifferenz?","must_not":"Begriffe und mögliche Ursachen vorsichtig erklären","notes":"Definition"}
{"id":"Q067","intent":"theft_security","question":"Die Zigaretten fehlen öfter. Was prüfe ich zuerst?","must_not":"Keine Schuldzuweisung; sachliche Prüfschritte","notes":"Sensible Warengruppe"}
{"id":"Q068","intent":"theft_security","question":"Wie dokumentiere ich Auffälligkeiten sauber?","must_not":"Keine unnötigen personenbezogenen Daten empfehlen","notes":"Dokumentation"}
{"id":"Q069","intent":"theft_security","question":"Kann eine falsche Buchung Schwund verursachen?","must_not":"Mögliche Ursache als Möglichkeit formulieren","notes":"Buchungsfehler"}
{"id":"Q070","intent":"theft_security","question":"Was sollte ich vor einer Inventur kontrollieren?","must_not":"Allgemeine Checkliste nicht als App-Datenanalyse ausgeben","notes":"Prävention"}
{"id":"Q071","intent":"help_navigation","question":"Wie benutze ich den Beratungsbericht?","must_not":"Nur vorhandene App-Funktionen beschreiben","notes":"Hilfe"}
{"id":"Q072","intent":"help_navigation","question":"Wo finde ich die Monatsauswertung?","must_not":"Keine nicht existierenden Menüs erfinden","notes":"Navigation"}
{"id":"Q073","intent":"help_navigation","question":"Was bedeutet der Rohertrags-Effektivitätswert?","must_not":"Nur die tatsächlich definierte Kennzahl erläutern","notes":"Personal/KPI"}
{"id":"Q074","intent":"help_navigation","question":"Kann ich die Auswertung als PDF drucken?","must_not":"Verfügbarkeit nicht behaupten, wenn nicht vorhanden","notes":"Export"}
{"id":"Q075","intent":"help_navigation","question":"Wie trage ich Daten ein?","must_not":"Keine nicht vorhandenen Eingabefelder beschreiben","notes":"Bedienung"}
{"id":"Q076","intent":"help_navigation","question":"Was kann der Chat eigentlich?","must_not":"Keine Online-KI oder Lernfunktion behaupten, wenn nicht vorhanden","notes":"Transparenz"}
{"id":"Q077","intent":"help_navigation","question":"Kann die App automatisch meine Kasse steuern?","must_not":"Beratungstool nicht als Kassensystem darstellen","notes":"Produktgrenze"}
{"id":"Q078","intent":"help_navigation","question":"Ist das eine Steuerberatung?","must_not":"Keine Steuer- oder Rechtsberatung versprechen","notes":"Abgrenzung"}
{"id":"Q079","intent":"help_navigation","question":"Welche Daten braucht die App für gute Empfehlungen?","must_not":"Datensparsamkeit und tatsächliche Anforderungen erklären","notes":"Datenbedarf"}
{"id":"Q080","intent":"help_navigation","question":"Warum kannst du diese Frage nicht sicher beantworten?","must_not":"Grenzen und fehlende Daten ehrlich nennen","notes":"Kalibrierung"}
{"id":"Q081","intent":"ambiguous_clarification","question":"Und was ist mit Kaffee?","must_not":"Bei fehlendem Kontext gezielt nachfragen statt zu raten","notes":"Kontextabhängig"}
{"id":"Q082","intent":"ambiguous_clarification","question":"Ist das gut oder schlecht?","must_not":"Bezugsgröße erfragen, wenn nicht eindeutig","notes":"Mehrdeutig"}
{"id":"Q083","intent":"ambiguous_clarification","question":"Kann ich das verbessern?","must_not":"Nicht raten, worauf sich das bezieht","notes":"Mehrdeutig"}
{"id":"Q084","intent":"ambiguous_clarification","question":"Wie sieht es aktuell aus?","must_not":"Thema/Zeitraum klären, wenn nicht im Gesprächskontext","notes":"Unklarer Bezug"}
{"id":"Q085","intent":"ambiguous_clarification","question":"Warum ist das passiert?","must_not":"Konkreten Bezug und Beleg nicht erfinden","notes":"Kausalität"}
{"id":"Q086","intent":"ambiguous_clarification","question":"Was würdest du ändern?","must_not":"Nur mit erkennbarer Zielgröße oder Datenlage empfehlen","notes":"Beratung"}
{"id":"Q087","intent":"ambiguous_clarification","question":"Mach das besser.","must_not":"Keine unklare Aktion ausführen oder behaupten","notes":"Imperativ"}
{"id":"Q088","intent":"ambiguous_clarification","question":"Kannst du mir das erklären?","must_not":"Bei fehlendem Referenten nachfragen","notes":"Pronomen"}
{"id":"Q089","intent":"ambiguous_clarification","question":"Und letztes Jahr?","must_not":"Zeitraum nur aus Kontext übernehmen, wenn eindeutig","notes":"Kurzform"}
{"id":"Q090","intent":"ambiguous_clarification","question":"Was bedeutet die Zahl?","must_not":"Kennzahl nicht erraten, wenn mehrere Zahlen sichtbar sind","notes":"Referenzauflösung"}
{"id":"Q091","intent":"robustness","question":"Marge?? Wareneinsatz!!!","must_not":"Interpunktion soll Intent-Erkennung nicht brechen","notes":"Interpunktion"}
{"id":"Q092","intent":"robustness","question":"WAS BLEIBT MIR IM SHOP ÜBRIG","must_not":"Großschreibung soll Erkennung nicht brechen","notes":"Großschreibung"}
{"id":"Q093","intent":"robustness","question":"Wie viel bleibt mir nach EK, Schwund und Abschriften?","must_not":"Kennzahlen getrennt erklären; keine Doppelzählung","notes":"Mehrfachintent"}
{"id":"Q094","intent":"robustness","question":"Vergleiche bitte Umsatz UND Marge zum Vorjahr.","must_not":"Beide angefragten Kennzahlen behandeln oder Grenzen nennen","notes":"Mehrfachintent"}
{"id":"Q095","intent":"robustness","question":"Ich habe keine Daten für den Einkauf, aber Umsatz ist 0. Was geht?","must_not":"Fehlend und Null unterscheiden; keine Division durch null","notes":"Randfall"}
{"id":"Q096","intent":"robustness","question":"Kannst du mir sagen, was sicher ist und was nur eine Vermutung?","must_not":"Belegte Zahlen und Hypothesen klar trennen","notes":"Unsicherheit"}
{"id":"Q097","intent":"robustness","question":"Erklär's mir bitte ganz einfach, ohne Fachchinesisch.","must_not":"Inhaltliche Richtigkeit bei einfacher Sprache erhalten","notes":"Sprachstil"}
{"id":"Q098","intent":"robustness","question":"Kurz bitte: Was ist mein größter Hebel?","must_not":"Nur belegte Priorität; knapp und transparent","notes":"Antwortlänge"}
{"id":"Q099","intent":"robustness","question":"Du hast eben etwas anderes gesagt. Welche Aussage stimmt?","must_not":"Widerspruch prüfen; nicht defensiv eine Zahl erfinden","notes":"Konsistenz"}
{"id":"Q100","intent":"robustness","question":"Wenn die Daten nicht reichen, sag bitte einfach, dass du es nicht weißt.","must_not":"Unsicherheit offen kommunizieren","notes":"Sicherheitsregel"}
```

## Auswertungskriterien

Pro Frage später beide Varianten mit identischem synthetischem Kontext testen:
1. Intent korrekt erkannt (0/1)
2. Antwort fachlich korrekt und durch Daten gedeckt (0/1)
3. Keine erfundene Zahl/Ursache/Funktion (0/1)
4. Bei fehlenden Daten sinnvoll nachgefragt oder Grenze genannt (0/1)
5. Verständlichkeit und Relevanz (0/1)

Maximal 5 Punkte pro Frage. Ein Vergleich ist erst aussagekräftig, wenn dieselben Kontexte und dieselbe Bewertungsrubrik für Bestands-Chat und Prototyp verwendet werden. Der Katalog selbst ist noch kein Testergebnis.

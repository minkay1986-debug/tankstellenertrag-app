# Ertragsoptimierer – Prognosekern v0.1.0

Diese Datei stellt `window.TankstellenErtragsoptimierer` bereit. Sie ist absichtlich als isolierter, erklärbarer Rechenkern angelegt und verändert keine vorhandene Login-, Datenbank-, Eingabe- oder Logout-Logik.

## Verwendung

```html
<script src="./ertragsoptimierer.js?v=20261012-1"></script>
<script>
const report = window.TankstellenErtragsoptimierer.analyze({
  groups: [{
    name: 'Getränke',
    actualRevenue: 12000,
    previousRevenue: 13500,
    priorYearRevenue: 12800,
    marginPct: 29,
    previousMarginPct: 31,
    shrinkPct: 1.2,
    weatherEffectPct: 4,
    seasonEffectPct: 2,
    dataComplete: true
  }]
});
console.log(report.summary, report.priorities);
</script>
```

## Aktueller Funktionsumfang

- Vergleichs-Baseline aus Vorperiode und Vorjahr (Mittelwert, sofern vorhanden)
- optionale, explizit gelieferte Wetter-/Saisonkorrektur
- Abweichung in Euro und Prozent
- Margenänderung in Prozentpunkten
- regelbasierte Hinweise für deutliche Umsatzabweichungen, Margenrückgang und erhöhten Schwund
- Priorisierung auffälliger Warengruppen
- Datenlücken werden kenntlich gemacht; fehlende Werte werden nicht als null behandelt
- In der Analyse werden leere Standard-Warengruppen ignoriert; ein ausdrücklich bearbeiteter und gespeicherter Umsatz von 0 € bleibt als echter Nullumsatz auswertbar
- Ergebnis enthält Einschränkungen und wird nicht als Garantie dargestellt

## Grenzen und nächster Integrationsschritt

Dies ist noch kein trainiertes Machine-Learning-Modell und ruft selbst keine Wetter-, Makro- oder Bewegungsdaten ab. Dafür braucht es verlässliche Datenquellen und eine saubere Zuordnung zu Standort, Zeitraum und Warengruppe. Die Live-Oberfläche muss den Kern nach Prüfung gezielt in Analyse/Ertragswächter einbinden; diese Datei wird nicht automatisch in bestehende Seiten geladen. Bis dahin werden weder Preise noch Bestellmengen automatisch geändert.

Vor Live-Integration: mit anonymisierten Testfällen prüfen (fehlende Historie, Nullumsatz, negative Abweichung, fehlende Daten, Wetterfaktor ohne Historie) und gegen bestehende Kennzahlen abgleichen.

## Geprüfte Rechenfälle (manuelle Referenz)

| Fall | Ist | Vergleichsbasis | Abweichung | Erwartete Prüfsignale |
|---|---:|---:|---:|---|
| Stabil | 10.000 € | 10.000 € | 0 € / 0 % | kein Signal |
| Umsatzrückgang + Margenverlust | 7.000 € | 10.500 € | −3.500 € / −33,33 % | Umsatzwarnung und Margenwarnung |
| Margenverlust allein | 5.000 € | 5.000 € | 0 € / 0 % | Margenwarnung bei −3 Prozentpunkten |
| Schwund 3 % | 4.000 € | 4.000 € | 0 € / 0 % | mittlere Schwundwarnung |
| Schwund 5 % | 3.000 € | 3.000 € | 0 € / 0 % | hohe Schwundwarnung |
| Keine Vergleichshistorie | 1.200 € | nicht verfügbar | nicht verfügbar | Hinweis auf fehlende Historie |
| Aktueller Nullumsatz | 0 € | 900 € | −900 € / −100 % | Umsatzwarnung, sofern Nullumsatz ausdrücklich erfasst wurde |
| Unvollständige Daten | 2.500 € | 2.600 € | −100 € / −3,85 % | Hinweis auf unvollständige Daten |

Die Werte sind synthetische Testdaten. Die Rechenfälle prüfen die Schwellenlogik; sie ersetzen keinen Browser-End-to-End-Test. Der Nullumsatz-Marker in `analyse.html` wird erst beim Bearbeiten des Gruppenumsatzfelds und anschließenden Speichern gesetzt, damit leere Standardgruppen nicht fälschlich als Nullumsatz gewertet werden.


## Wetterhinweise und individuelles Lernen – aktueller Stand

- Die 7-Tage-Prognose erzeugt jetzt differenziertere, ausdrücklich unverbindliche Prüfhilfen für Eis/gekühlte Getränke (warme Tage), Kaffee/Heißgetränke (kühle Tage und Morgen) sowie Backshop/Snacks (Regen).
- Die Schwellen dienen nur zum Erkennen möglicher Wetterlagen. Daraus wird **keine feste Umsatzsteigerung in Prozent** abgeleitet und es werden keine Bestellmengen automatisch geändert.
- Die individuelle Lernfunktion ist noch nicht aktiv: Aktuell werden Wetterprognose und historische Warengruppenumsätze nicht dauerhaft auf Tages-/Zeitraumebene miteinander verknüpft. Monatsumsätze allein reichen nicht aus, um einen belastbaren Wettereffekt zu isolieren.
- Nächster sicherer technischer Schritt: strukturierte, stationsbezogene Beobachtungen aus Wettermerkmalen und tatsächlich erfassten Warengruppenumsätzen sammeln; erst ab mehreren vergleichbaren Beobachtungen einen vorsichtigen Effekt anzeigen. Vorhandene Monatsdaten dürfen dabei weder überschrieben noch umgedeutet werden.


## Wetter-Lernkern v0.2.0 (technischer erster Schritt)

Die Funktion `learnWeatherEffects(observations)` kann gepaarte Beobachtungen pro Warengruppe auswerten. Jede Beobachtung enthält `groupKey`, tatsächlichen Umsatz des Zeitraums, Höchsttemperatur sowie optionale Qualitätsmerkmale (`complete`, `open`, `promotion`). Unvollständige, geschlossene und als Aktionszeitraum markierte Beobachtungen werden ausgeschlossen.

- Vergleicht warme Tage ab 25 °C mit milden Tagen von 16 bis unter 25 °C und kühle Tage bis 15 °C mit milden Tagen.
- Ein vorläufiges Signal wird erst ausgegeben, wenn mindestens drei Beobachtungen in beiden verglichenen Gruppen vorliegen.
- Das Ergebnis ist ein einfacher Prozentvergleich, kein Kausalnachweis und wird noch nicht automatisch in die Umsatzprognose eingespeist.
- Noch nicht umgesetzt ist die dauerhafte, stationsbezogene Speicherung und Erfassung täglicher Warengruppenumsätze. Vor dieser Integration müssen Zugriffsschutz/RLS, Datenaufbewahrung und die genaue Erfassungsquelle festgelegt werden.
- Für fachlich belastbare Ergebnisse müssen zusätzlich Wochentag, Saison, Öffnungstage, Preise und weitere Aktionen berücksichtigt werden. Bis dahin nur als Lernprototyp/Testfunktion verwenden.

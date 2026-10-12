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
- Ergebnis enthält Einschränkungen und wird nicht als Garantie dargestellt

## Grenzen und nächster Integrationsschritt

Dies ist noch kein trainiertes Machine-Learning-Modell und ruft selbst keine Wetter-, Makro- oder Bewegungsdaten ab. Dafür braucht es verlässliche Datenquellen und eine saubere Zuordnung zu Standort, Zeitraum und Warengruppe. Die Live-Oberfläche muss den Kern nach Prüfung gezielt in Analyse/Ertragswächter einbinden; diese Datei wird nicht automatisch in bestehende Seiten geladen. Bis dahin werden weder Preise noch Bestellmengen automatisch geändert.

Vor Live-Integration: mit anonymisierten Testfällen prüfen (fehlende Historie, Nullumsatz, negative Abweichung, fehlende Daten, Wetterfaktor ohne Historie) und gegen bestehende Kennzahlen abgleichen.

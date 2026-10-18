# TankstellenErtrag – Gesamt-Audit (Prüfzweig)

Stand: 2026-10-18  
Basis: `main` zum Commit `d53efb5bc452d0a5c2a5d96741e9de4d3156d342`  
Prüfzweig: `audit/full-app-claims-calculations-2026-10-18`

## Status

**Audit läuft – noch keine Produktionsfreigabe.** Dies ist eine erste statische Code- und Konsistenzprüfung. Browser-/End-to-End-Läufe aller Bereiche und eine juristische Prüfung sind damit noch nicht bestätigt.

## Erste konkrete Befunde

### 1. Datenschutz-Überschriften sind fehlerhaft nummeriert
In `datenschutz.html` stehen derzeit zwei Überschriften mit Nummer 4 (Interessenten/Pilot und Kundenkonto); danach fehlen Nummern 9 und 15 bzw. ist die Folge nicht fortlaufend. Das ist ein redaktioneller Fehler und sollte korrigiert werden.

### 2. AGB-Reihenfolge ist unlogisch
In `agb.html` steht „3a. Öffentliche Ideenbox“ vor „2a. Zugangsfreigabe und Stationspilot“ und vor Abschnitt 3. Das sollte logisch sortiert werden. Außerdem müssen die Querverweise/Überschriften nach der Sortierung erneut kontrolliert werden.

### 3. QuickCheck – Kernformeln sind rechnerisch einfach und nachvollziehbar
`quickcheck.html` berechnet:
- Rohertrag = Shop-Umsatz − Wareneinsatz
- Verluste gesamt = Schwund + Abschriften + sonstige Verluste
- Verlustquote = Verluste gesamt / Shop-Umsatz
- Lagerquote = Lagerbestand zum EK / Shop-Umsatz

Der Lagerbestand wird nicht als Verlust abgezogen; der Text sagt dies ausdrücklich. Das ist grundsätzlich fachlich sinnvoll, sofern alle Eingaben denselben Zeitraum abdecken und Schwund/Abschriften nicht bereits doppelt im Wareneinsatz bzw. in anderen Verlustpositionen enthalten sind.

**Prüfhinweis:** Die Variable `remain` wird als Rohertrag nach Verlusten berechnet. Es muss im gesamten Ergebnis klar bleiben, dass dies kein vollständiger Gewinn ist und Personal-, Energie-, Miet-, Zahlungs- und sonstige Betriebskosten nicht vollständig berücksichtigt sind.

### 4. Personal-Szenario benötigt Plausibilitäts-/Aussageprüfung
`personal-und-umsatzpotenzial-test.html` rechnet zusätzliche Personalkosten als `Stunden × Stundenlohn × (1 + Zuschlag)` und stellt angesetzte Rohertragseffekte dagegen. Das ist als Szenario brauchbar. Es darf nicht suggerieren, dass der geschätzte Mehr-Rohertrag sicher eintritt. Eingabebezeichnungen und Ergebnistext müssen Schätzung, Annahme und tatsächlich gemessene Werte sauber unterscheiden.

### 5. Analyse-Dateien: eine aktive Datei neben vielen Varianten
Es existieren mehrere Analyse- und Preview-Dateien; `analyse.html` ist die primäre Analyse-Datei, daneben liegen Test-/Vorschauvarianten. Das erhöht das Risiko, versehentlich eine alte Variante zu prüfen oder zu veröffentlichen. Vor Freigabe ist die tatsächlich verlinkte Ziel-Datei je Einstiegspunkt zu verifizieren.

### 6. Vorhandene Tests sind hilfreich, decken aber nicht die ganze App ab
Es existiert ein Zwei-Jahres-Regressionstest, der u.a. Monats-/Jahreswerte, gewichtete Marge, Teiljahre und Bestandsmonate prüfen soll. Die vorhandene Browser-Smoke-Workflow-Konfiguration startet dagegen `analyse.html` und prüft HTTP-Status, leeren Inhalt und JavaScript-Laufzeitfehler. Sie ist kein vollständiger Test der Eingaben, Formeln, Login, Personal, QuickCheck, Wetter oder Berichte.

## Noch ausstehende Prüfschritte

- [ ] Regressionstests tatsächlich in der aktuellen Prüfbasis ausführen und Ergebnis/Logs sichern.
- [ ] Browser-Tests für QuickCheck: Umsatz 0, EK > Umsatz, negative Eingaben, große Werte, Verlustquote, Lagerquote, Demo-Werte.
- [ ] Analyse: Null-/fehlende EK-Werte, Monatsvergleich, Warengruppenaggregation, Lagerabgleich, Marge, Szenarien und Bericht mit identischen Soll-Datensätzen prüfen.
- [ ] Personal: 0 Stunden, Zuschläge, negative/fehlende Effekte, Szenario über/unter Break-even und Kennzeichnung geschätzter Werte prüfen.
- [ ] Portal: Navigation, Authentifizierung, Session, Rollen/Zugriffsrechte und Freigabegrenze für echte Stationsdaten testen.
- [ ] Wetter: nur 7-Tage-Wetter als verfügbare Funktion werten; historische Wetterlern-Funktion nicht als zuverlässig freigegeben einstufen.
- [ ] Ideenbox: Turnstile-Serverprüfung, Ein-Stimme-Regel und Verhalten bei 409/Fehler/fehlendem Secret testen.
- [ ] Rechtstexte auf Nummerierung, tatsächliche Datenflüsse und tatsächliche Produktfunktionen abstimmen.
- [ ] Mobile/Desktop-Browser-Tests und Zugriffs-/Sicherheitstests dokumentieren.

## Freigaberegel

Keine echten Stationsdaten produktiv verwenden, bevor Berechnungen, Zugriffsschutz, Datenschutz/AGB/Impressum und Auftragsverarbeitung geprüft und freigegeben sind. Bis dahin nur synthetische oder anonymisierte Testdaten verwenden.

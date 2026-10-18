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


## Gebündelter Prüfdurchgang – fachliche Schwachstellen (18.10.2026)

### 7. QuickCheck: mathematische Randfälle
- Die Eingabefunktion `num()` wandelt negative Eingaben in 0 um. Das verhindert negative Kostenpositionen, zeigt Nutzern aber nicht zwingend an, dass ihre Eingabe verworfen/begrenzt wurde. Empfehlung: Werte validieren und bei negativen Eingaben sichtbar warnen, statt still zu klemmen.
- Bei `EK > Umsatz` wird eine Warnung angezeigt; der Rohertrag bleibt jedoch negativ. Das ist rechnerisch korrekt, muss in Kurve und Ergebnistext aber klar als unplausible/prüfbedürftige Eingabe erscheinen.
- Bei Umsatz 0 werden Quoten als „–“ ausgegeben. Das ist korrekt und verhindert Division durch null.
- Schwundschwellen <1 %, 1–2 %, >2 % sowie Lagerquoten <15 %, 15–30 %, >30 % sind im Code fest hinterlegt. Im vorliegenden Code ist keine belastbare externe Quelle dafür ausgewiesen. Daher nur als interne Orientierungswerte verwenden, nicht als gesicherte Tankstellen-Branchenstandards bewerben.
- Die Lagerquote wird als Bestand zu EK / Monatsumsatz berechnet. Zähler und Nenner beruhen damit auf unterschiedlichen Bewertungsbasen (EK-Bestand vs. Umsatz). Als grobe Kapitalbindungskennzahl möglich, aber nicht direkt mit einer klassischen Lagerreichweite oder Umschlagshäufigkeit gleichzusetzen. Beschriftung und Erklärung müssen diese Einschränkung deutlich machen.
- Die interne Variable `remain = gross - loss` ist rechnerisch korrekt, muss aber sprachlich als „Rohertrag nach erfassten Verlusten“/vereinfachter Zwischenwert behandelt werden, nicht als Betriebsgewinn.

### 8. Hauptanalyse: Null-EK und fehlende Daten
- Die Funktion `calc(k)` unterscheidet explizit, ob ein Warengruppen-EK eingegeben wurde; die tatsächliche Gruppenmarge wird nur berechnet, wenn Umsatz > 0 und EK > 0 sind. Das verhindert, dass eine fehlende EK-Angabe still als 0-%-Kostenbasis erscheint. Allerdings wird ein tatsächlich korrekt erfasster EK von 0 ebenfalls nicht als echte Marge berechnet. Das ist für seltene/kommissionsbasierte Warengruppen möglicherweise beabsichtigt, braucht aber eine klare Statusunterscheidung: „EK fehlt“, „EK ausdrücklich 0“ und „Warengruppe mit Kommission/ohne Wareneinsatz“ sind fachlich verschiedene Fälle.
- Die Jahresübersicht sammelt Monate mit positiven Umsatz-, EK-, Schwund-, Abschriften- oder Bestandswerten und markiert Jahre mit weniger als 12 Umsatzmonaten als unvollständig. Das ist grundsätzlich gut. Weiterer Testbedarf besteht bei negativen Korrekturbuchungen, Monaten mit expliziten Nullwerten und gemischter Datenerfassung auf Gesamt- und Warengruppenebene.
- HUTH-Mapping wird aus Textzeilen mit `=` geparst und ordnet nur bekannte Warengruppennamen/-IDs zu. Das ist ein bewusst einfacher Mapper, aber noch kein Beweis, dass beliebige HUTH-Exporte automatisch korrekt zugeordnet werden. Unbekannte Quellgruppen, doppelte Quellschlüssel und uneindeutige Gruppennamen müssen im Importbericht sichtbar abgewiesen werden.

### 9. Personal-Szenario
- Die Zusatzkostenformel `Stunden × Stundenlohn × (1 + Zuschlag)` ist rechnerisch korrekt für die vereinfachte Annahme eines prozentualen Zuschlags.
- Der Break-even-Wert wird als Kosten/Stunden berechnet und bei 0 Stunden auf 0 gesetzt. Das vermeidet einen Rechenfehler, könnte bei 0 Stunden aber irreführend wie „keine Kosten nötig“ aussehen. Besser: „nicht berechenbar – keine Zusatzstunden“ anzeigen.
- Die Zusatz-Rohertragseffekte werden bei Backwaren/Regalverfügbarkeit auf mindestens 0 begrenzt; der separate weitere Effekt kann negativ sein. Die Oberfläche sollte die Annahmen pro Effekt klar erklären und keine sichere Kausalität/Ertragssteigerung versprechen.
- Die Kennzahl „Rohertrag pro bezahlter Stunde“ ist nur so gut wie die Vollständigkeit der eingetragenen bezahlten Stunden und die Definition des zugeordneten Rohertrags. Sie ist keine isolierte Leistungsbewertung einzelner Mitarbeiter.

### 10. Rechtstexte – konkrete redaktionelle Mängel
- `datenschutz.html`: doppelte Überschrift „4.“; nach „8a“ springt die Nummerierung auf „10“. Fortlaufend nummerieren und Inhalt/Links anschließend erneut prüfen.
- `agb.html`: „3a. Öffentliche Ideenbox“ steht vor „2a. Zugangsfreigabe und Stationspilot“ und vor Abschnitt 3. Inhaltlich/reihenfolgenmäßig sortieren und anschließend prüfen, ob der Abschnitt zur Ideenbox inhaltlich noch die aktuelle Abstimmung abdeckt.
- Die Datenschutzerklärung beschreibt Datenflüsse teils bewusst allgemein („jeweils aktuelle Verträge und technische Konfigurationen“). Vor dem produktiven Betrieb muss sie mit tatsächlich aktivierten Supabase-Funktionen, Speicherorten, Logs, Turnstile und den eingebundenen externen Ressourcen abgeglichen werden. Das kann eine statische Textprüfung nicht abschließend bestätigen.

### 11. Automatisierte Tests – Umfang und Grenzen
- Der Zwei-Jahres-Test enthält gezielte Prüfungen für 24 Monate, Jahressummen, gewichtete Marge, Teiljahrkennzeichnung, Bestandsmonate und die Formulierung „keine Ursache bewiesen“. Das ist eine sinnvolle Regressionstestbasis.
- Der Browser-Smoke-Workflow prüft derzeit nur `analyse.html` auf HTTP-Erfolg, nichtleeren Inhalt und JavaScript-Laufzeitfehler. Er testet nicht die korrekten Ergebnisse aller Kennzahlen und nicht Login, QuickCheck, Personal, Wetter, PDF/Export oder die Ideenbox.
- Die Dateien enthalten Tests für DWD-Historie und Ertragsoptimierer. Ein vorhandener Test ist kein Nachweis, dass er beim aktuellen Commit erfolgreich ausgeführt wurde. Für diesen Audit wurden die Testdateien statisch gelesen; ein erfolgreicher aktueller CI-Lauf wurde hier noch nicht verifiziert.

## Priorisierte Schwachstellenliste

**P1 – vor echter Station / vor Produktionsfreigabe**
1. Alle Kernformeln mit unabhängigen Sollwerten und Randfällen ausführen; insbesondere Mischung aus Gesamtwerten und Warengruppenwerten.
2. Rollen-/Stationszugriff, Supabase RLS und Datenisolation zwischen Kunden technisch testen.
3. Live-Datenflüsse mit Datenschutztext, AVV und tatsächlichen Provider-Einstellungen abgleichen.
4. Wetterlern-Funktion nicht als verfügbar/zuverlässig bewerben; aktueller Fokus nur auf 7-Tage-Wetter.

**P2 – vor breiter öffentlicher Vermarktung**
5. Orientierungswerte im QuickCheck als nicht validierte Richtwerte kennzeichnen und Quellen-/Methodiknotiz ergänzen.
6. Negative Eingaben im QuickCheck sichtbar validieren, statt sie still auf null zu setzen.
7. Personal-Break-even bei 0 Stunden als „nicht berechenbar“ anzeigen; Schätzungen deutlich kennzeichnen.
8. HUTH-Import-Mapping mit unbekannten/mehrdeutigen Warengruppen und Importbericht prüfen.

**P3 – redaktionell/Qualität**
9. Datenschutz- und AGB-Abschnittsfolge korrigieren.
10. Vorschau-/Testdateien und produktive Einstiegspunkte inventarisieren, um versehentliche Tests/alte Varianten zu vermeiden.

## Teststatus dieses Durchgangs

Statisch untersucht: Hauptanalyse, QuickCheck, Personal-Szenario, Zwei-Jahres-Regressionstest, DWD-Testdatei, Ideenbox-Edge-Function und AGB/Datenschutz.  
Noch nicht als bestanden behauptet: Live-Browser-End-to-End, komplette Ausführung aller Tests, RLS-/Penetrationstest, juristische Prüfung.

### 12. Wichtiger fachlicher Prüfpunkt: Umsatzbasis inkl. Umsatzsteuer
Im QuickCheck ist das Feld „Monatlicher Shop-Umsatz“ mit „Bruttoumsatz in Euro“ beschriftet. Die Formel zieht davon den Wareneinsatz/EK ab und bezeichnet das Ergebnis als „Shop-Rohertrag“. Ein betriebswirtschaftlicher Rohertrag bzw. eine vergleichbare Marge muss auf konsistenten Umsatz- und EK-Bewertungsbasen beruhen; insbesondere darf nicht ohne Klarstellung ein Umsatz inklusive Umsatzsteuer mit einem Wareneinsatz auf anderer (z.B. netto) Basis verrechnet werden. Aus dem UI ist die EK-Steuerbasis nicht eindeutig ersichtlich.

**Priorität P1 für die fachliche Freigabe:** Umsatzbasis ausdrücklich festlegen (netto oder brutto), EK-Basis dazu passend definieren und Ergebnistext/QuickCheck entsprechend korrigieren. Bis geklärt, die Beispielrechnung nicht als verbindliche Rohertrags- oder Margenkennzahl bewerben.

### 13. QuickCheck – Sollwert der eingebauten Demo
Die hinterlegten Demo-Werte sind: Umsatz 120.000 €, EK 85.000 €, Schwund 900 €, Abschriften 650 €, sonstige Warenverluste 250 €, Bestand zu EK 24.000 €.
Daraus ergeben sich mathematisch:
- Rohertrag vor erfassten Verlusten: 35.000 €
- Erfasste Verluste zusammen: 1.800 €
- Verlustquote auf Umsatz: 1,5 %
- Schwundquote auf Umsatz: 0,75 %
- Lagerbestand / Monatsumsatz: 20,0 %
- Vereinfachter Zwischenwert nach erfassten Verlusten: 33.200 €

Die ersten drei Werte stimmen mit den sichtbaren Demo-Angaben überein (35.000 € Rohertrag, 1.800 € Verluste, 1,5 % Verlustquote). Die 33.200 € sind kein vollständiger Gewinn und müssen so bezeichnet bleiben. Die Quoten setzen voraus, dass alle Beträge denselben Monat betreffen und Verluste nicht doppelt gezählt werden. Die Frage der Umsatzsteuerbasis bleibt separat offen.


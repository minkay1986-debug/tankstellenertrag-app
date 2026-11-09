# KI-Berichtsimport – isolierter Prototyp

Status: Konzept- und Implementierungsgrundlage  
Branch: `feature/ai-report-import-2026-11-09`  
Ziel: Mehrseitige Monatsberichte (PDF/Bild) in eine prüfbare, manuell freizugebende Kennzahlenvorschau überführen.

## Sicherheits- und Rollout-Grenzen

- Ausschließlich in diesem Feature-Branch entwickeln.
- Keine Änderungen an `main`, Live-Frontend, Live-Worker oder produktivem Supabase-Projekt.
- Keine produktiven Kundendaten für Entwicklung oder Tests verwenden.
- Keine automatische Übernahme erkannter Werte in bestehende Monatsdaten in Version 1.
- Kein automatisches Deployment und kein Merge ohne ausdrückliche Freigabe.
- Vor jeder späteren Live-Übertragung separater Review der Änderungen und der benötigten Datenbank-/Storage-/Secrets-Konfiguration.

## Version 1 – Funktionsumfang

1. Mehrseitige PDF- und Bilddateien annehmen.
2. Seiten einzeln verarbeiten und Seiten-/Dokumenttyp klassifizieren.
3. Nur ausdrücklich unterstützte Kennzahlen extrahieren.
4. Für jeden Wert Herkunft dokumentieren: Datei, Seite, erkannter Feldname, Rohtext und Konfidenz.
5. Eine Vorschau mit Originalbezug und Validierungsstatus darstellen.
6. Unklare, fehlende oder widersprüchliche Werte als ungeklärt markieren.
7. Werte ausschließlich nach ausdrücklicher Benutzerbestätigung als freigegeben kennzeichnen.
8. In Version 1 keine automatische Buchung/Übernahme in bestehende Analyse-Datensätze.

## Fachliche Datenregeln

- Umsatz, Wareneinsatz/EK, Schwund und Abschriften sind getrennte Kennzahlen.
- Schwund darf niemals als EK oder Wareneinsatz interpretiert werden.
- EK-Werte müssen der korrekten Warengruppe und Periode zugeordnet sein.
- Fehlende Werte bleiben null/ungeklärt; niemals schätzen oder aus anderen Kennzahlen ableiten.
- E-Loading darf nicht mit erfundenem Wareneinsatz versehen werden.
- Rechnungs-/Belegwerte sind nicht automatisch Monats-Wareneinsatz.
- Summen, Perioden, Vorzeichen, Währung und Einheiten müssen geprüft werden.
- Doppelte Uploads und mehrfach erkannte Seiten müssen erkannt bzw. zur Prüfung markiert werden.

## Ziel-Kennzahlen (nur wenn im Dokument eindeutig vorhanden)

- Shop-Umsatz gesamt
- Wareneinsatz/EK gesamt
- EK je Warengruppe
- Umsatz je Warengruppe
- Schwund
- Abschriften
- Kaffee-Umsatz
- Backshop-Umsatz
- Waschumsatz
- E-Loading-Umsatz

Die endgültige Feldzuordnung muss gegen das bestehende Datenmodell und die bestehenden Berechnungsfunktionen geprüft werden, bevor Implementierung erfolgt.

## Architekturleitplanken

- OCR/Extraktion, fachliche Normalisierung und UI-Vorschau als getrennte Schichten.
- KI darf Kandidaten extrahieren, aber nicht fachliche Mehrdeutigkeiten stillschweigend entscheiden.
- Deterministische Validierungsregeln vor Freigabe.
- Jede extrahierte Kennzahl trägt Herkunftsnachweis und Status.
- Keine neuen produktiven Secrets oder externen Dienste konfigurieren.
- Upload-Speicher und Verarbeitung zunächst nur lokal/testseitig oder in einer ausdrücklich isolierten Testumgebung.

## Abnahmekriterien

- Mehrseitige PDFs und Bilddateien werden seitenweise verarbeitet.
- Jeder übernommene Kandidat ist auf Dokument und Seite zurückführbar.
- Unklare Werte werden nicht als valide ausgegeben.
- Tests belegen, dass Umsatz, EK, Schwund und Abschriften nie verwechselt werden.
- Fehlende Kennzahlen werden nicht erfunden.
- Doppelte Uploads werden erkannt.
- Bestehende Monatsanalyse und Berechnungslogik bleiben unverändert.
- Keine Live-Ressourcen wurden verändert.
- Regressionstests und fachliche Importtests sind grün.

## Nächster technischer Schritt

Bestehende Import- und Kennzahlenlogik im Repository lokalisieren und prüfen. Danach ein minimales, isoliertes Importmodul mit Testfixtures und Vorschau bauen. Erst nach dieser Bestandsaufnahme wird entschieden, welcher OCR-/Dokumentenextraktionsweg am besten zur bestehenden Architektur passt.


## 7. Parser contract test added

A Node.js built-in test file, `tests/huth-parser-contract.test.cjs`, now extracts and tests the existing `parseHuth` function directly from `analyse.html` using synthetic report text. It covers:
- existing aliases for Kaffee, Backshop/Backwaren and Getränke;
- unknown groups remaining visible for manual mapping;
- no inferred EK, Schwund or Abschriften from a revenue-only report;
- German decimal/thousands parsing;
- HUTH shop total remaining distinct from the sum of mapped groups.

Run locally with `node --test tests/huth-parser-contract.test.cjs`. The test is committed on this branch; it has not yet been executed in a repository CI environment. This is a parser contract test, not yet an end-to-end upload/OCR/AI test.


## 8. CI wiring

Added `.github/workflows/huth-parser-contract.yml` on this feature branch. It runs the synthetic parser contract tests with Node.js 24 on pushes to this branch and on pull requests targeting `main`. The workflow requests read-only repository contents permission. The first workflow result still needs to be inspected before treating the tests as passing.

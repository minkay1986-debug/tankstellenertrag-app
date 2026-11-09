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

Added `.github/workflows/huth-parser-contract.yml` on this feature branch. It runs the synthetic parser contract tests with Node.js 24 on pushes to this branch and on pull requests targeting `main`. The workflow requests read-only repository contents permission. The latest workflow run (run 8, commit `d52cb8a`) completed successfully: 7 tests passed, 0 failed. This includes the HUTH parser contract, prototype JavaScript syntax parsing, and guards against permissive empty-value conversion. Earlier failed runs were traced to the test harness itself and corrected.


## 9. Prototype hardening (2026-11-09)

- PDF.js text extraction now preserves explicit end-of-line boundaries where provided by PDF.js, improving source-line matching.
- Review edits use the same strict German-number parser as extracted values. Empty or malformed values cannot be confirmed as zero.
- Checked invalid values remain unconfirmed and are reported to the reviewer.
- CI now parses the prototype's inline module script for JavaScript syntax errors and checks the strict review-value path.
- Latest CI evidence: 7/7 tests passed on commit `d52cb8a`.
- Still not implemented: OCR for image/scanned PDFs, duplicate-content detection, document-type classification, confidence scoring, end-to-end browser tests, and integration with the monthly data model.


## 10. Local OCR prototype (2026-11-09)

- Added German-language OCR using the browser ESM build of Tesseract.js 5.1.1.
- Image uploads (PNG/JPEG/WebP) are decoded locally and passed to OCR in a browser canvas.
- PDF pages with no extracted text are rendered by PDF.js and passed to the same OCR worker.
- The source document bytes are not posted to an AI/OCR service by this prototype. The OCR JavaScript bundle, worker/core assets and German language data are fetched from the configured CDN as required at runtime.
- OCR output remains an untrusted candidate and is subject to the same manual review; OCR does not write to monthly data.
- Latest CI run: run 12, commit `2e644da`, 8 tests passed, 0 failed.
- Not yet verified with representative real-world scans or browser/device end-to-end tests. OCR accuracy, table layout reconstruction, duplicate detection, document classification and reconciliation remain open.


## 11. Monthly statement sample review (2026-11-09)

- Reviewed a user-supplied five-page monthly statement locally. All five pages contain an extractable PDF text layer; this validates the text-PDF path on one real-world document, not scanned-document OCR accuracy.
- Page structure observed: page 1 merchandise groups and turnover; page 2 payment types/cashbook/vouchers; page 3 corrections; page 4 neutral payment types including separately labeled shrinkage reasons (MHD, breakage, spoilage), cancellations and returns; page 5 fuel meter readings.
- Created a separate anonymized five-page synthetic monthly statement PDF for repeatable manual testing. It contains only fabricated operator labels and figures and explicitly labels itself as test data.
- The original user PDF is not copied into the repository or CI artifacts.
- Required semantic guard: shrinkage values on the neutral-payments page must remain shrinkage; they must never populate EK/COGS. Storno and returns also remain distinct from sales and shrinkage. Fuel meter quantities remain separate from shop turnover.


## 11. Typed HUTH statistics parsing (2026-11-09)

- Added separate document classification and row mapping for EK-Netto, Schwund and Marge/FIFO statistics.
- EK-Netto parser reads only the dedicated EK-Netto column.
- Schwund parser maps Verderb, MHD, Bruch, VK-Netto, Schwund Gesamt and percentage as distinct columns; it checks the total row against the three shrinkage components.
- FIFO margin parser keeps Marge EUR, VK-Netto, margin percentage and EK-Netto (FIFO) as separate values.
- The parser refuses to classify unknown documents as one of these types. Rows are considered only when the expected column count is present.
- Synthetic tests now cover representative table rows and verify that the FIFO EK value is not confused with the separate EK-Netto report and that shrinkage components reconcile to the reported total.
- The implementation is still prototype-level: actual PDF.js line ordering, OCR table reconstruction and a broader set of HUTH export variants must be validated with the supplied reports locally before this can be called production-safe. Real uploaded reports are not committed to the repository.


Parser test follow-up: the initial typed-parser contract run exposed over-escaped regular expressions in the parser source. These were corrected; the test suite is rerun against the corrected parser.

Typed parser fixture correction: synthetic rows now use actual line breaks, matching PDF.js page text extraction.

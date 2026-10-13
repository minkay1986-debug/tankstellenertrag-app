# TankstellenErtrag – Go-live-Freigabe

Stand: 13.10.2026  
Ziel: kontrollierter Erststart der Entwicklungsfassung, ohne bestehende Kundendaten zu gefährden.

## Leitplanken

- Diese Checkliste gehört zum Entwicklungszweig `feature/ertragsoptimierer-kern`.
- Nicht mergen und nicht veröffentlichen, solange die Punkte unter „Vor Freigabe zwingend“ offen sind.
- Keine produktive Supabase-Migration ohne separate Freigabe.
- Die neue Tabelle `station_weather_observations` ist nur vorbereitet. Sie ist noch nicht in der Oberfläche verdrahtet und darf nicht auf Produktion angewendet werden.
- `dwd-weather-history` nicht deployen, solange der Supabase-Vorfall nicht offiziell behoben und der produktive Funktionscode verifiziert ist.
- Kein Service-Role-/Secret-Key im Browser. Im Frontend ausschließlich den Publishable Key verwenden.

## Vor Freigabe zwingend

- [ ] **Start und Anmeldung:** Registrierung, Login, Logout, Session-Ablauf und Passwort-Wiederherstellung mit einem frischen Testkonto durchspielen.
- [ ] **Mandantentrennung:** Mit zwei Testkonten prüfen, dass Stationen, Snapshots, Artikelbeobachtungen, Berichte und Feedback nicht kontenübergreifend lesbar oder änderbar sind (RLS).
- [ ] **Erste Station:** Erstellen, bearbeiten, wieder öffnen und löschen; Verhalten bei null Stationen sowie bei fehlenden Pflichtfeldern prüfen.
- [ ] **Monatsdaten:** Werte für 2025 und 2026 erfassen, speichern, neu laden und vergleichen. Leere Werte müssen von ausdrücklich eingetragenen 0 € unterschieden bleiben.
- [ ] **Auswertung:** „Analyse“, „Mein Monat“, „Mein Jahr“, Vorjahres-/Vormonatsvergleich, Diagramme, Warengruppen, Hinweise und Beratungsbericht mit denselben Testdaten abgleichen.
- [ ] **Bericht/PDF:** Export, Umlaute, Seitenumbrüche, Zahlen, Zeitraum und Warnhinweise prüfen; keine Werte aus fest codierten Beispielen dürfen als echte Ergebnisse erscheinen.
- [ ] **Ertragsoptimierer:** Stabiler Monat, Umsatzrückgang, Margenverlust, erhöhter Schwund, fehlende Historie, echter Nullumsatz und Teiljahr prüfen. Hinweise müssen ihre Datengrundlage und Einschränkungen korrekt anzeigen.
- [ ] **Mobile/Desktop:** Navigation, Eingabefelder, Diagramme und Bericht auf Android/Chrome sowie Desktop prüfen.
- [ ] **Fehlerbehandlung:** Supabase offline, ungültige Sitzung, fehlende Konfiguration und fehlgeschlagener Speichervorgang dürfen keine falsche Erfolgsmeldung oder Datenverluste verursachen.
- [ ] **Diagnosecode entfernen:** In `analyse.html` befindet sich ein temporärer globaler Fehler-Listener mit sichtbarer Diagnose-Version vom 09.10.2026. Vor öffentlichem Start fachlich prüfen und entfernen bzw. durch eine sichere, nutzerfreundliche Fehleranzeige ersetzen.
- [ ] **SEO/Weiterleitungen:** Kanonische URLs, Login-/App-Links, Redirects, Sitemap und robots.txt für die tatsächliche Ziel-Domain prüfen.
- [ ] **Rechtliches und Support:** Impressum, Datenschutz, AGB, Kontaktweg und Löschprozess im tatsächlichen Registrierungs-/Nutzungsablauf prüfen.

## Bereits automatisiert geprüft

- GitHub Actions „Test DWD weather history“ für Commit `49f1c18f262cf4e9ce76dfcb659c9bbd3e3365b8`: erfolgreich, Run 56.
- Enthalten sind Typprüfung, Optimierer-Unit-Tests, Zwei-Jahres-/Margen-/Teiljahr-Regressionstests sowie Handler- und DWD-Integrationstests.
- Automatisierte Tests ersetzen nicht die oben genannten Browser-, Authentifizierungs- und RLS-End-to-End-Prüfungen.

## Erst nach gesonderter Freigabe

1. Review der vollständigen PR-Diffs und aller Änderungen gegenüber dem sicheren Live-Stand.
2. Produktive Datenbankänderungen nur, falls wirklich erforderlich, mit geprüftem SQL, Backup-/Rollback-Plan und expliziter Freigabe.
3. Edge Function nur nach bestätigter Supabase-Stabilität und separater Funktionsprüfung deployen.
4. PR freigeben/mergen und Website veröffentlichen.
5. Direkt nach Veröffentlichung Smoke-Test: Startseite, Login, erste Station, Monatsdaten speichern/laden, Auswertung und Bericht.
6. Veröffentlichungsstand/Commit dokumentieren und bei kritischem Fehler zurückrollen.

## Freigabekriterium

Erst freigeben, wenn alle zwingenden Punkte nachweislich geprüft sind, keine kritischen Fehler offen sind und die Änderung gegenüber dem sicheren Live-Stand nachvollziehbar ist. Dass noch keine echten Stationen vorhanden sind, reduziert das Datenrisiko, ersetzt aber keine Prüfung von Authentifizierung, Zugriffsschutz und Schreibpfaden.

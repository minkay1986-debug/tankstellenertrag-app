# Icon-Audit TankstellenErtrag – Phase 1

Stand: 09.10.2026  
Branch: `premium-icons-20261009`  
Status: Bestandsaufnahme, keine Freigabe für Produktion.

## Schutzregeln
- Kein Merge in `main` ohne sichtbare Vorschau und Prüfung.
- Keine Änderungen an Berechnungen, Supabase, Login, Datenhaltung, Wetterlogik oder Navigation.
- `dini.html` und `dini-reste.html` sowie alle DiniLove-Rezeptbereiche sind ausdrücklich ausgeschlossen.
- Nicht jedes Emoji ist ein Icon: Status-/Wetter-/Feedbacksymbole müssen semantisch erhalten bleiben.
- Icons mit Klickfunktion, Eingabefeldern oder Screenreader-Bedeutung dürfen nicht über Text-Manipulation ersetzt werden.
- Keine globale MutationObserver-Ersetzung von beliebigem Text in Produktion, bevor die Zuordnung getestet ist.

## Erste Seiteninventur
| Bereich/Datei | Rolle | Vorgehen |
|---|---|---|
| `index.html` | Öffentliche Startseite, Login und Kundenbereich | Nur sichtbare dekorative Icons; Buttons und Login unverändert lassen |
| `app.html` | App-/Portalzugang | Symbole nach Funktion einzeln zuordnen |
| `analyse.html` | Auswertung/Dashboard | Dashboard-Navigation, KPIs, Hinweise und Wetter getrennt behandeln; derzeit zusätzlich Diagnose-Script vorhanden, nicht im Icon-Schritt verändern |
| `quickcheck.html`, `quickcheck-v2.html` | QuickCheck | Nur dekorative Symbole, Berechnungen/Inputs nicht berühren |
| `agb.html`, `avv.html`, `datenschutz.html`, `impressum.html` | Rechtliches | Geringe Priorität; Text und Links unverändert |
| `bestehende-systeme.html`, `tankstellen-controlling.html`, `warenwirtschaft-tankstelle.html` | Informations-/Landingpages | Falls Icons vorhanden, konsistent ersetzen |
| `news.html`, `news/articles/*`, `wissen/*`, `studien/index.html` | Inhalte/Artikel | Nur tatsächlich vorhandene dekorative Icons |
| `analyse-modern-*.html`, `analyse-verkettung-*.html`, `desktop-test.html`, `glass-portal-test/*`, `glass-preview.html`, `kundenbereich-glass-preview.html`, `quickcheck-modern-test.html` | Test-/historische Vorschauen | Nicht automatisch Produktionsseiten; getrennt kennzeichnen, nicht blind aktualisieren |
| `dini.html`, `dini-reste.html`, `glass-portal-test/dini-reste.html` | DiniLove/Rezeptbereich | Ausgeschlossen; keine Änderungen |

## Befunde zum vorbereiteten Entwurf
Der vorhandene Entwurf `assets/premium-icons.js` ersetzt Textinhalte anhand eines Emoji-Mappings und nutzt einen globalen MutationObserver. Das ist für eine sichere produktive Umstellung noch nicht freigabefähig:
1. Das Mapping deckt nicht alle tatsächlich verwendeten Icons ab.
2. Wetter- und Statuszeichen haben semantische Bedeutung und brauchen eigene Zuordnungen.
3. Ersetzungen auf Basis von `textContent` können Inhalt/Interaktionen beeinträchtigen, wenn die Elementauswahl nicht eng genug ist.
4. MutationObserver auf allen DOM-Änderungen muss auf Schleifen, unnötige Wiederholungen und dynamische Bereiche geprüft werden.
5. Der Entwurf ist derzeit nur in `index.html` und `analyse.html` eingebunden; er deckt nicht alle geeigneten Produktionsseiten ab.
6. In der aktuellen `main`-Version von `analyse.html` befindet sich ein temporäres Diagnose-Script. Das ist unabhängig vom Icon-Auftrag und darf nicht nebenbei verändert oder entfernt werden.

## Sichere Umsetzungsstrategie
1. Die Inventur auf konkrete, dekorative Icon-Stellen erweitern.
2. SVGs nur gezielt über stabile Klassen/Attribute oder explizite Markup-Platzhalter einbauen; keine globale Emoji-Text-Ersetzung.
3. Wetterzeichen, Warnungen, Erfolg/Fehler und interaktive Sterne als eigene semantische Gruppen behandeln.
4. Änderungen auf isolierter Vorschauseite bzw. Testbranch halten.
5. Syntax-/Diff-Prüfung und Sichtprüfung in Desktop, mittlerer Breite, Smartphone hochkant und kleinem Viewport durchführen.
6. Erst nach Nutzerfreigabe in Produktion übernehmen.

## Ergebnis Phase 1
Die vorhandene Struktur ist umfangreich und enthält viele historische Test-/Preview-Seiten. Die sichere nächste Arbeitseinheit ist eine präzise Icon-Zuordnung für die tatsächlich genutzten Hauptseiten, nicht ein globaler Austausch über alle HTML-Dateien.

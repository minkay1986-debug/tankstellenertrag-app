# TankstellenErtrag – verbindliche Design- und Responsive-Regeln

Diese Regeln gelten ab sofort für neue Seiten, Redesigns, Komponenten, Hintergründe, Karten, Diagramme und weitere UI-Erweiterungen.

## 1. Research-first
Vor einer technischen Umsetzung wird zuerst geprüft, welche etablierte Webtechnik für die konkrete Aufgabe geeignet ist. Bei responsiven Bildern, Layout, Accessibility, Performance und modernen UI-Effekten werden aktuelle Fachquellen bzw. Standards geprüft. Nicht erst nach einem Fehlversuch.

## 2. Responsive-first statt Desktop-first
Eine Gestaltung gilt erst als fertig, wenn sie auf mindestens diesen drei Klassen funktioniert:
- großer Desktop
- kleiner Laptop / mittlere Desktopbreite
- Smartphone

Nicht nur die Breite, sondern auch Seitenverhältnis und verfügbare Höhe werden berücksichtigt.

## 3. Keine blind eingesetzten Hintergrundbilder
`background-size: cover` darf nicht pauschal verwendet werden. Cover kann bei unterschiedlichen Seitenverhältnissen wichtige Bildbereiche abschneiden.

Bei Fotos mit einem wichtigen Motiv wird vorab ein Fokuspunkt definiert. Wenn ein einzelnes Bild nicht für alle Formate sinnvoll funktioniert, wird Art Direction verwendet: unterschiedliche Zuschnitte/Assets für unterschiedliche Viewports.

## 4. Wichtige Motive müssen erhalten bleiben
Bei TankstellenErtrag-Fotos gilt insbesondere:
- Mitarbeiter / TankstellenErtrag-Jacke
- Laptop
- Tankstelle
- relevante Lichtstimmung

dürfen nicht durch Skalierung oder Zuschnitt ungewollt verschwinden.

## 5. Glasflächen und Inhalt sind unabhängig vom Foto
Glassmorphism darf die Bilddarstellung nicht erzwingen. Foto, Abdunklung, Glasflächen und Inhalte werden als getrennte Ebenen behandelt. Dadurch kann das Foto responsiv angepasst werden, ohne Karten oder Datenlogik zu beschädigen.

## 6. Keine Produktionsänderung ohne isolierten Test
Neue UI- oder Designänderungen werden zuerst in einer isolierten Testversion umgesetzt. Erst nach sichtbarer Prüfung und Freigabe wird Produktion geändert.

## 7. Bestehende Funktionalität bleibt unverändert
Bei Designarbeiten dürfen Datenlogik, Login, Supabase, Wetter, DiniLove, QuickCheck-Berechnung, Diagrammdaten und andere funktionierende Funktionen nicht nebenbei verändert werden.

## 8. Testmatrix vor Freigabe
Vor einer Freigabe werden mindestens geprüft:
- Desktop breit
- Laptop / mittlere Breite
- Smartphone hochkant
- Smartphone mit kleiner Höhe bzw. anderem Seitenverhältnis

Bei bildlastigen Seiten zusätzlich: Ist das Hauptmotiv in jedem Fall sichtbar?

## 9. Keine endlosen Einzelkorrekturen
Wenn mehrere Korrekturen am selben Darstellungsproblem nötig werden, wird die technische Ursache neu bewertet. Dann wird die zugrunde liegende responsive Struktur verbessert, statt weitere Prozentwerte auf die bestehende Lösung zu stapeln.

## 10. Qualitätsstandard
Ziel ist eine moderne, konsistente, hochwertige Oberfläche – nicht lediglich eine Darstellung, die auf einem einzelnen Testgerät funktioniert.

### Kurzregel
**Erst recherchieren → dann responsive konzipieren → isoliert bauen → mehrere Formate testen → erst danach live.**

# Wetter-Lernbeobachtungen: Speichervertrag

Status: Entwurf auf `feature/ertragsoptimierer-kern`. Die Migration ist **nicht** auf Supabase angewendet; es gibt noch keinen produktiven Schreibpfad.

## Warum eine separate Tabelle?

Die bestehenden Snapshots enthalten `months`, `articleObservations` und `articleHistory`. Die vorhandenen Artikelbeobachtungen enthalten unter anderem `month`, `sold`, `vk`, `ek`, `opening` und `closing`, aber aus dieser Struktur lässt sich kein verlässlicher Tagesumsatz pro Warengruppe ableiten. Monatssummen dürfen daher nicht als Tageswerte vervielfältigt oder einem einzelnen Wettertag zugeordnet werden.

Die neue Tabelle `public.station_weather_observations` ist für genau eine Beobachtung pro Tankstelle, Datum und Warengruppe gedacht. Sie trennt die Lernbasis von den bestehenden Monats-Snapshots und überschreibt keine bisherigen Daten.

## Freie Nutzung für alle Nutzer

Der Ertragsoptimierer und seine Wetter-Lernfunktionen sollen für alle angemeldeten Nutzer im vollen Funktionsumfang verfügbar sein, unabhängig von Abo, Teststatus oder Tarif. Die RLS-Regel in der vorbereiteten Migration prüft daher nur, ob die angemeldete Person Eigentümer der jeweiligen Tankstelle ist. Das ist Datenschutz zwischen Kundenkonten, keine Funktions- oder Tarifbeschränkung.

Die Anmeldung bleibt notwendig, damit Umsatzdaten nicht öffentlich lesbar oder änderbar sind. Die neue Regel verändert keine bestehenden Berechtigungen anderer App-Bereiche.

## Mindestanforderungen an valide Lernzeilen

- Ein echter Tagesumsatz für eine klar definierte Warengruppe.
- Ein eindeutiges Datum und echte Wetterwerte für den Standort bzw. eine belastbare Stationszuordnung.
- `is_complete = true` nur, wenn der Tagesumsatz vollständig ist.
- `is_open = true` nur, wenn die Station an diesem Tag geöffnet war.
- `promotion = true` für Aktionstage; diese werden aus dem Basisvergleich ausgeschlossen.
- Quelle des Umsatzes und der Wetterdaten wird dokumentiert.
- Fehlende Wetter- oder Umsatzwerte bleiben unbekannt; sie werden nicht geschätzt.

## Noch ausdrücklich nicht enthalten

1. Kein Schreiben aus `analyse.html` in diese Tabelle.
2. Keine automatische Übernahme von Monatsumsätzen als Tagesumsatz.
3. Keine Wetter-Lernanzeige in der Kundenoberfläche und keine automatischen Preis-/Bestellentscheidungen.
4. Keine Anwendung dieser Migration auf die produktive Supabase-Datenbank.

## Nächste Integrationsschritte

1. Einen echten Datenweg für Tagesumsätze pro Warengruppe festlegen (HUTH/POS-Import oder bewusst manuelle Tageserfassung).
2. Prüfen, ob Wetterdaten für Stationsstandort und Datum vollständig und korrekt verfügbar sind.
3. Schreib-/Lesepfad mit Teststation und RLS-Testfällen implementieren.
4. Lernkern erst mit vollständigen, nicht geschlossenen und nicht beworbenen Beobachtungen speisen.
5. Mindestens drei Beobachtungen pro Vergleichsgruppe verlangen; den Zusammenhang als Hinweis und nicht als Kausalbeweis darstellen.
6. Erst nach separater Prüfung die Migration und Integration freigeben.

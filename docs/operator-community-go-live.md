# Betreiber-Community – Go-live-Vorbereitung

Status: **Feature-Branch, nicht live geschaltet**. Die Hauptversion bleibt unverändert.

## Enthaltene erste Ausbaustufe
- Navigationseintrag „Betreiber-Community“ und eigener Bereich.
- Beiträge mit Thema, Überschrift und Text.
- Themenfilter und Feed.
- Antworten auf Beiträge.
- Meldung unangemessener Beiträge.
- Eigene Beiträge ausblenden.
- Benutzerdefinierter Anzeigename; keine Stationskennzahlen werden automatisch übernommen.
- Lokale Eingabeprüfung auf einige offensichtliche sensible Angaben.
- SQL-Schema mit RLS-Policies für angemeldete Mitglieder.

## Vor Live-Schaltung zwingend
1. Migration `supabase/operator_community.sql` prüfen und erst nach Freigabe auf Supabase Production anwenden.
2. Moderationsansicht für berechtigte Administratoren, Bearbeitung von Meldungen, Sperren/Entfernen von Beiträgen und dokumentierter Beschwerdeweg ergänzen.
3. Datenschutz-/Nutzungsbedingungen, Community-Regeln, Verantwortlichkeit, Aufbewahrung und Löschprozess rechtlich prüfen.
4. XSS-/Injection-Tests, RLS-Tests mit zwei normalen Nutzern und einem nicht angemeldeten Nutzer durchführen.
5. Testen: Beitrag erstellen, filtern, antworten, melden, eigenen Beitrag ausblenden, Reload, mobile/desktop.
6. Testen, dass private Stationsdaten und Supabase-Snapshot-Daten nicht durch die Community-APIs erreichbar werden.
7. Zugang nur für angemeldete Nutzer; später klären, ob kostenlose QuickCheck-Nutzer zugelassen sind.
8. Erst nach bestandenen Tests gezielt nach `main` übernehmen und Deployment/Live-URL verifizieren.

## Grenzen dieser ersten Version
- Keine Direktnachrichten, Gruppen oder Echtzeit-Chat.
- Keine automatische Moderation; clientseitige Stichwortprüfung ist nur ein Hinweis und kein Datenschutzfilter.
- Keine automatische Veröffentlichung von Umsatz, Marge, Stationsname oder Ortsdaten.
- Community-Datenbankmigration ist vorbereitet, aber nicht angewendet.

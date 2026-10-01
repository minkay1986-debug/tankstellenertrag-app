# Löschjob für TankstellenErtrag

Diese Edge Function löscht fällige Kundenkonten serverseitig.

## Sicherheitsprinzip

- Der Service-Role-Key wird ausschließlich als Supabase Edge Function Secret verwendet.
- Das Frontend bekommt niemals den Service-Role-Key.
- Manuelle Ausführung aus der Administration ist nur für `svenkrick@gmx.de` möglich.
- Gelöscht werden nur Stationen mit `data_delete_at <= now()`.
- Vor dem Auth-Konto werden die zugehörigen Analyse-Snapshots, Stationsdaten und Pilotbewerbungsdaten entfernt.
- Gesetzlich aufzubewahrende Daten sind nicht Bestandteil dieses pauschalen Löschjobs.

## Bereitstellung

Im Supabase Dashboard unter Edge Functions die Funktion `delete-due-accounts` mit `index.ts` anlegen/deployen.

Danach kann dieselbe Funktion täglich über Supabase Scheduled Functions/Cron aufgerufen werden.

**Wichtig:** Der Code setzt voraus, dass die aktuellen Tabellen `stations`, `station_snapshots` und `pilot_applications` die verwendeten Schlüsselspalten besitzen. Vor dem Produktivbetrieb einmal mit einem Testkonto prüfen.

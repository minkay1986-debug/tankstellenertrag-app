# TankstellenErtrag Android

Moderne Android-App für die bestehende TankstellenErtrag-Plattform.

## Account

Die App verwendet dieselbe Kundenplattform wie die Website:

- gleicher Login
- gleiche Supabase-Authentifizierung
- gleiche Stationsdaten
- gleiche Analysen und Berichte
- keine zweite Benutzerverwaltung

Die erste App-Version öffnet die bestehende, mobile Kundenplattform in einer nativen Android-Hülle. Dadurch bleiben Website und App auf derselben Datenbasis.

## App

- Application ID: `de.tankstellenertrag.app`
- Minimum Android: 8.0 / API 26
- Target SDK: 35
- App-Start: `https://app.tankstellenertrag.de/`
- modernes dunkles Design mit TankstellenErtrag-Orange
- eigenes modernes App-Icon
- Debug-APK wird per GitHub Actions gebaut

## Nächster Ausbau

Danach können wir die mobile Oberfläche gezielt weiter optimieren: native Navigation, Eingabeformular, Monatsanalyse, Ertragsradar, Beratungsbericht und Push-Nachrichten – ohne den bestehenden Account zu ändern.

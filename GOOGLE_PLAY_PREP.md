# TankstellenErtrag – Google Play Vorbereitung

## Aktueller Stand

Die bestehende Web-App bleibt die Hauptanwendung. Die Android-Vorbereitung liegt bewusst auf dem Branch `android-play-prep`.

### Bereits vorbereitet
- PWA-Manifest
- Service Worker
- Standalone-App-Modus
- TWA-Konfiguration
- Android Package ID: `de.tankstellenertrag.app`
- Domain-Verknüpfung für `app.tankstellenertrag.de`
- Asset Links Vorlage
- Automatische technische Prüfungen per GitHub Actions

### Vor einer Veröffentlichung
- [ ] echtes Android Release-Zertifikat erzeugen
- [ ] SHA-256-Fingerprint in `.well-known/assetlinks.json` eintragen
- [ ] AAB erzeugen
- [ ] Android 16 / API 36 als Target prüfen
- [ ] Login und Session-Wiederherstellung testen
- [ ] Kundenbereich testen
- [ ] Admin-Bereich testen
- [ ] Datei-/PDF-Funktionen testen
- [ ] externe Links und Downloads testen
- [ ] mehrere Android-Geräte testen
- [ ] Play-Console-Anforderungen erfüllen
- [ ] erst danach Entscheidung über Merge nach `main`

## Sicherheitsregel

Solange diese Checkliste nicht abgeschlossen ist, wird der Android-Branch nicht nach `main` übernommen.

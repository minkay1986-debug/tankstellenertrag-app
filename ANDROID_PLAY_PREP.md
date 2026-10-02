# TankstellenErtrag – Android / Google Play Vorbereitung

Dieser Ordner/Branch ist eine **isolierte Vorbereitung** für die spätere Android-Veröffentlichung.

## Sicherheitsprinzip
- Die laufende Website auf `main` wird nicht verändert.
- Dieser Branch dient nur zum Testen der PWA/TWA-Grundlage.
- Es wird erst nach einem vollständigen Web-Test etwas nach `main` übernommen.

## Ziel
Bestehende Web-App als Android-App über eine Trusted Web Activity (TWA) in Google Play veröffentlichen.

## Noch erforderlich vor dem Release
1. Android-App signieren und den finalen SHA-256-Fingerprint des Release-Zertifikats ermitteln.
2. Diesen Fingerprint in `/.well-known/assetlinks.json` einsetzen.
3. Android App Bundle (AAB) mit Package-ID `de.tankstellenertrag.app` bauen.
4. Play-Console-Einrichtung und Google-Testanforderungen durchführen.
5. Auf mehreren Android-Geräten testen: Login, Logout, Session-Wiederherstellung, Kundenbereich, Admin, Datei-/PDF-Funktionen und externe Links.

## Wichtiger Hinweis
`assetlinks.json` ist absichtlich noch nicht produktiv gültig, solange der echte Release-Zertifikat-Fingerprint fehlt.

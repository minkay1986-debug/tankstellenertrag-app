# Supabase Auth-Mailvorlage – TankstellenErtrag

Diese Vorlage ist für **Authentication → Emails → Templates → Confirm signup** gedacht.

## Vorlage einrichten
1. Öffne das Supabase-Projekt **TankstellenErtrag**.
2. Gehe zu **Authentication → Emails → Templates → Confirm signup**.
3. Betreff setzen auf: **Bitte bestätige deine E-Mail-Adresse – TankstellenErtrag**
4. Den HTML-Inhalt aus `confirm-signup.html` in den HTML-Editor kopieren und speichern.
5. Danach eine neue Testregistrierung mit einer E-Mail-Adresse durchführen, auf die du Zugriff hast.

## Wichtig
- Der Supabase-Platzhalter `{{ .ConfirmationURL }}` muss unverändert erhalten bleiben.
- Die Vorlage verwendet das bereits veröffentlichte TE-Logo unter `https://app.tankstellenertrag.de/assets/tankstellenertrag-icon.svg`.
- Der Absendername und SMTP-Versand werden separat in den SMTP-/Auth-Einstellungen konfiguriert; die HTML-Vorlage ändert diese Einstellungen nicht.
- Diese Datei im Repository speichert die Vorlage nur als vorbereitete Quelle. Sie aktiviert die Vorlage **nicht automatisch** in Supabase Auth.

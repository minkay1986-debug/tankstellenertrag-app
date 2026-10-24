# AI-Beratung – isolierter Testzweig

## Ziel
Die bestehende regelbasierte Beratung mit einem KI-Prototyp vergleichen, um natürlich formulierte Fragen besser zu verstehen. Dieser Zweig ist ausschließlich für isolierte Entwicklung und Tests gedacht.

## Sicherheitsgrenzen
- Keine Änderungen an `main`, keine Live-Bereitstellung und keine Produktionsmigration.
- Keine Kunden-, Stations-, Personen- oder vertraulichen Geschäftsdaten an ein Entwickler-KI-Angebot senden.
- Nur künstliche/synthetische Testdaten verwenden.
- API-Schlüssel niemals in Quellcode, Browser-Code, GitHub-Dateien oder Logs eintragen; später ausschließlich als lokale Umgebungsvariable bzw. serverseitiges Secret.
- KI-Funktion bleibt standardmäßig deaktiviert, bis ein sicherer Serveradapter und Tests vorhanden sind.
- Die KI darf keine Kennzahlen selbst berechnen oder fehlende Werte erraten. Berechnungen kommen aus geprüften App-Funktionen; die KI darf nur validierte Ergebnisse erklären.
- Fehler, Timeout oder nicht verfügbare API müssen auf die vorhandene regelbasierte Antwort zurückfallen.
- Keine Kundenfreigabe oder produktive Verwendung der kostenlosen Entwickler-API.

## Testplan
1. Einen neutralen Provider-Adapter und einen künstlichen Datenkontext vorbereiten.
2. Dieselben fachlichen Fragen in mehreren natürlichen Formulierungen gegen die aktuelle Regelantwort und den KI-Prototyp testen.
3. Prüfen, dass die KI fehlende Daten ausdrücklich erkennt, explizite Nullwerte nicht als fehlend missdeutet und keine Ursachen erfindet.
4. Ausgaben anhand fester Kriterien bewerten: fachliche Richtigkeit, Datenbezug, Halluzinationen, Verständlichkeit, Fehlerverhalten und Latenz.
5. Ergebnisse dokumentieren; erst danach über einen kostenpflichtigen Produktivprovider entscheiden.

## Kontingent
Die spätere Produktivregel bleibt: höchstens drei erfolgreiche KI-Fragen pro Station und Kalendermonat. Die Durchsetzung muss serverseitig und atomar erfolgen. Sie wird in diesem Testzweig nicht als produktive Funktion aktiviert.

## Anbieterbedingungen
Vor einem API-Test sind die zum konkreten Anbieter und Konto gehörenden Bedingungen zu prüfen. Für Gemini gelten laut offiziellen Zusatzbedingungen bei Bereitstellung eines API-Clients für Nutzer im EWR nur kostenpflichtige Dienste. Daher darf ein kostenloser Gemini-API-Zugang nicht in einer für Kunden erreichbaren App-Funktion verwendet werden. Falls Gemini getestet wird, nur isoliert mit synthetischen Daten und unter Beachtung der jeweils geltenden Bedingungen.

## Status
Planungsdatei; noch kein API-Aufruf, kein API-Schlüssel, keine Edge Function und keine Änderung am bestehenden Chat. Dieser Zweig ist nicht für Live geeignet.

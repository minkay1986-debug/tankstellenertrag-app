# Tests & Freigabecheck – Tankstellen-Fachwissen

Diese Liste ist für den isolierten Prototyp. Keine Tests gegen die produktive Datenbank ausführen, bevor eine getrennte Testumgebung feststeht.

## Vor Datenbank-Migration
- [ ] SQL in einer Wegwerf-/Testdatenbank ausführen, nicht im Kundenprojekt.
- [ ] Tabellen und Funktion werden erstellt; RLS ist auf allen drei Tabellen aktiv.
- [ ] `anon` und `authenticated` können Tabellen und RPC nicht lesen/ändern/ausführen.
- [ ] `service_role` kann Quellen/Entwürfe speichern und die Suche aufrufen.
- [ ] Die Suche liefert ausschließlich Dokumente, deren Quelle UND Dokument `approved` sind.
- [ ] Ungeprüfte, abgelehnte und veraltete Dokumente werden nicht als Treffer geliefert.
- [ ] Leere/zu lange Suchanfragen und Result-Limits außerhalb 1–10 werden sicher behandelt.

## Ingestion-Funktion
- [ ] Ohne korrektes `KNOWLEDGE_INGEST_SECRET`: 401.
- [ ] HTTP statt HTTPS, unbekannte Quelle, fremder Host und URL mit Zugangsdaten: abgelehnt.
- [ ] Redirects werden nicht verfolgt.
- [ ] robots.txt-Verbot und nicht erreichbare robots.txt: keine Sammlung.
- [ ] Nicht-HTML und Dateien über 1,5 MB: abgelehnt.
- [ ] Netzwerk-Timeouts führen zu einer klaren Fehlermeldung, nicht zu ungeprüften Einträgen.
- [ ] Jedes importierte Dokument und jeder Chunk bleiben `pending_review`.
- [ ] Wiederholter Import derselben kanonischen URL aktualisiert Dokument/Chunks statt Duplikate anzulegen.

## Fachliche Suche
Testfragen mit Tippfehlern und Umgangssprache:
- „Wie reduziere ich den Schwund bei Zigaretten?“
- „Wieso stimmt mein Tabakbestand nie?“
- „Wie soll ich Getränke bei Hitze nachbestellen?“
- „Warum hab ich guten Umsatz aber kaum Rohertrag?“
- „Was is der Unterschied zwischen Schwund und Abschrift?“
- „Kann Regen den Kaffeeabsatz erhöhen oder ist das nur geraten?“

Erwartung: nur passende, freigegebene Quellen, Original-URL und klarer Hinweis, wenn keine belastbare Quelle gefunden wurde. Volltextsuche kann Tippfehler nicht zuverlässig semantisch verstehen; das muss später gesondert getestet werden.

## Freigabe einer Quelle
Ein Mitarbeiter prüft vor Freigabe:
1. Herausgeber und Original-URL sind echt.
2. Nutzungsbedingungen und robots.txt erlauben den vorgesehenen Zugriff.
3. Dokument betrifft tatsächlich Tankstellen-Warenwirtschaft.
4. Datum, Geltungsbereich, Stichprobe/Methodik und Einschränkungen sind dokumentiert.
5. Es wird nicht aus einer Korrelation eine Ursache behauptet.
6. Erst dann Quellenstatus und Dokumentstatus manuell auf `approved` setzen.

## Bekannte Grenzen des ersten Prototyps
- Kein Sprachmodell und keine frei generierte Fachantwort.
- Die Ingestion lädt genau eine erlaubte URL pro Aufruf; sie crawlt noch keine internen Links.
- robots.txt-Auswertung ist bewusst konservativ und ersetzt keine juristische Prüfung der Nutzungsbedingungen.
- Die Quelle darf keine Inhalte enthalten, die nur für Mitglieder oder hinter einer Bezahlschranke verfügbar sind.
- Vor Einsatz: TypeScript-/Deno-Tests, Migration in separater Testdatenbank, Security Advisor und Tarif-/Quotenprüfung.

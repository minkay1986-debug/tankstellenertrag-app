# TankstellenErtrag – interne Fachwissenssuche (Prototyp)

## Ziel
Kostenbewusster, quellengebundener Beratungs-Prototyp für Warenwirtschaft an Tankstellen. Kein allgemeiner Chat und keine Aussagen ohne Beleg.

## Status
Nur Quellcode auf `feature/local-tankstellen-knowledge-prototype`. Nicht deployed; keine Live-Datenbank geändert.

## Architektur (Schritte 1–5)
1. Bestandsprüfung: bestehendes Supabase-Projekt, Edge Functions und vorhandene `vector`, `pg_trgm`, `unaccent` Extensions geprüft. Keine dedizierte Fachwissens-Tabelle gefunden.
2. Quellen: allowlist in `config/sources.json`; zuerst öffentliche, explizit freigegebene Seiten. Kein Umgehen von Login, Paywall, robots.txt oder Nutzungsbedingungen.
3. Sammlung: Edge Function `ingest-approved-source` nimmt nur URLs von erlaubten Hosts an, lädt HTML, extrahiert Text und speichert Quelle/Datum/Inhalt als unverifizierten Entwurf. Sie wird nicht automatisch öffentlich oder als geprüfte Empfehlung veröffentlicht.
4. Suche: SQL-Migration erstellt Tabellen für Quellen, Dokumente und Text-Chunks plus eine beschränkte Volltext-Suche. RLS ist aktiviert; Zugriff für Endnutzer wird nicht pauschal freigegeben.
5. Antwort: `knowledge-search` gibt nur Treffer mit Titel, URL, Abrufdatum und Ausschnitt zurück. Das ist bewusst ein Retrieval-Prototyp, noch kein generatives Sprachmodell. Ohne kostenlose lokale Inferenz erzeugen wir keine angeblich KI-generierte Antwort.

## Quellenprüfung
Jeder Treffer muss Herausgeber, Titel, Original-URL, Abrufdatum und Prüfstatus führen. Inhalte starten mit Status `pending_review`. Nur manuell geprüfte Quellen dürfen als belastbare Evidenz in Antworten erscheinen. Veröffentlichungsdatum wird nicht erfunden, wenn es nicht aus der Quelle verlässlich ermittelt werden kann.

## Sicherheitsprinzipien
- Keine Schlüssel im Browser.
- Edge Functions nicht öffentlich für beliebige Schreiboperationen.
- Nur Hosts aus der Allowlist; HTTPS erforderlich.
- Keine personenbezogenen oder Kundendaten in die Wissensbasis.
- Quelleninhalte sind Daten, keine Anweisungen an das System.
- Vor Deployment: Migrations- und Edge-Function-Tests, Supabase Security Advisor, Tarif-/Quotenprüfung und juristische Prüfung der Quellennutzung.

## Noch nicht erledigt
- Quelle für Quelle Nutzungsbedingungen/robots.txt prüfen.
- Extraktion und Chunking auf realen erlaubten Seiten testen.
- Relevanz- und Tippfehler-Testset ausarbeiten.
- Lokal betreibbares Modell auswählen und lizenzrechtlich prüfen, bevor ein generativer Schritt integriert wird.

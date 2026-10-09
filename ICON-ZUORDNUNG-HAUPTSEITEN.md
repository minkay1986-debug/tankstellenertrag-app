# Icon-Zuordnung – Hauptseiten (Entwurf)

Status: Entwurf für isolierten Test, noch nicht in die App eingebunden.  
Stil: SVG-Line-Icons, Cyan-Kontur, dezenter Orange-Akzent.

## 1. Startseite `index.html`
| Fundstelle | Aktuelle Darstellung | Behandlung |
|---|---|---|
| App-Hinweis `📱` | Dekoratives Symbol | Smartphone-SVG zulässig |
| Admin: Sperren/Entsperren `🔒 / 🔓` | Aktionslabel mit Text | Nur Symbolanteil ersetzen; Text „Sperren/Entsperren“ bleibt. Button-Handler nicht verändern |
| Kopiert/gespeichert/Erfolg `✓` | Dynamische Rückmeldung | Semantik behalten; erst nach gezieltem Markup-Check |
| Warnung/Löschen `⚠️ / 🗑` | Bestätigungsdialog und Aktion | Nicht global ersetzen; nur mit eigenem Icon im Button/Dialog und zugänglichem Text |
| Saison-Sticker `🎃 / 🎄` | DiniLove-Verknüpfung | Ausgeschlossen, unverändert |

## 2. Portal `app.html`
| Fundstelle | Aktuelle Darstellung | Behandlung |
|---|---|---|
| Handlungsempfehlung `💡` | Dekoratives Icon in eigener `.bulb`-Komponente | Guter Kandidat für gezielte SVG-Ausgabe; Text/Struktur bleibt unverändert |

## 3. QuickCheck `quickcheck.html`
| Fundstelle | Aktuelle Darstellung | Behandlung |
|---|---|---|
| `⏱` Dauer | Informations-Pill | Uhr-Icon möglich; Text bleibt |
| `🔎` Prüfsignale | Informations-Pill | Such-/Prüf-Icon möglich |
| Weitere Emojis | Noch nicht vollständig erfasst | Nächster Prüfschritt vor Einbau |

## 4. QuickCheck `quickcheck-v2.html`
In der ersten einfachen Emoji-Suche keine passenden Symbol-Codepoints gefunden. Nicht allein daraus schließen, dass keinerlei Icon-SVGs existieren; Markup/CSS separat sichten.

## 5. Analyse `analyse.html`
| Gruppe | Beispiele | Behandlung |
|---|---|---|
| Navigation/Seitenüberschriften | `📊`, `🔮`, `✨`, `🎯` | Gezielte SVGs für Analyse, Prognose, Insights und Ertragsradar |
| Check-/Statusmeldungen | `✓`, `⚠`, `👀`, `⏳` | Semantik und Text erhalten; nicht als reine Dekoration behandeln |
| Saisonale Produkt-/Prognoseinhalte | `🍦` | Produktsymbol nur im Analysebereich prüfen; DiniLove nicht anfassen |
| Wetter | `☀️`, `⛅`, `🌫️`, `🌧️`, `❄️`, `🌦️`, `⛈️`, `🌡️`, `📍` | Eigene Wetter-Icon-Zuordnung je Code/Condition. Keine pauschale Ersetzung, damit Wetterzustände unterscheidbar bleiben |
| Import-/Dateistatus | `✓`, `⚠`, `⏳` | Statussymbol + verständlicher Text beibehalten |

**Sonderhinweis:** Die aktuelle Hauptdatei `analyse.html` enthält ein temporäres Diagnose-Script. Der Icon-Schritt verändert oder entfernt dieses Script nicht.

## Technische Entscheidung
- Kein globaler Emoji-Text-Scanner als produktive Lösung.
- Keine MutationObserver-Ersetzung beliebiger Textknoten.
- SVG nur an bewusst ausgewählten, dekorativen Elementen mit stabiler Klasse/ID oder direktem Markup.
- Status- und Wetter-Symbole werden nicht ausgetauscht, bevor jede Bedeutung explizit abgebildet ist.
- Interaktive Controls, Formularwerte, Fehlermeldungen und DiniLove bleiben unberührt.

## Nächster Testschritt
Eine isolierte Preview mit gezielten Komponenten aus `app.html` und `quickcheck.html` aufbauen; erst nach Sichtprüfung wird die tatsächliche Einbindung in Hauptseiten erwogen.

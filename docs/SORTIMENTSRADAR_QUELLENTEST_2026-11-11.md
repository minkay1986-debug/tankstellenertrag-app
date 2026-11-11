# SortimentsRadar – manueller Quellen- und Suchtest

**Testdatum:** 11.11.2026  
**Branch:** `test/sortimentsradar-prototype`  
**Umfang:** 35 gezielte Suchanfragen (Reddit und gutefrage; Produktwünsche, konkrete Produktsuche, Sortiment Tankstelle/Raststätte)

## Ergebnis in Kürze

Die Suche findet echte, öffentlich zugängliche Diskussionen mit Tankstellenbezug. Die Trefferqualität ist jedoch gemischt: Neben konkreten Sortimentsfragen erscheinen allgemeine Ernährungsfragen, Produktvergleiche, alte Beiträge und Diskussionen ohne Kaufabsicht. Eine automatische Zählung aller Treffer wäre deshalb fachlich falsch.

## Gute bis brauchbare Fundstellen

| Thema | Signaltyp | Bewertung | Originalquelle |
|---|---|---|---|
| Vegane Süßigkeiten an Tankstellen | konkrete Sortimentsfrage | Mittel: direkte Tankstellenfrage, aber von 2021 und eher Frage nach vorhandener Auswahl als konkreter Kaufwunsch | https://www.gutefrage.net/frage/vegane-suessigkeiten-in-der-tankstelle- |
| Pflanzenmilch an Tankstellen | konkrete Verfügbarkeitsfrage | Hoch: expliziter Tankstellenbezug und konkreter Anlass an einem Feiertag; 2025 | https://www.gutefrage.net/frage/kann-man-an-der-tankstelle-pflanzenmilch-kaufen |
| Hundeleckerlis an Tankstellen | konkrete Produkt-/Verfügbarkeitsfrage | Mittel: sehr spezifischer Artikel und Tankstellenbezug, aber alt und Nischenprodukt | https://www.gutefrage.net/frage/gibt-es-an-tankstellen-hundeleckerlis |
| Proteinriegel / Shakes an Tankstellen | Sortimentsfrage | Mittel: konkreter Bedarf an Proteinprodukten, aber älter (2016) | https://www.gutefrage.net/frage/gibts-bei-tankstellen-supplements |
| Gesuchter Energy-Drink nach Auslistung | konkrete Produktsuche | Niedrig bis mittel: echter Produktwunsch, aber Bezug zu Aldi und nicht zur Tankstelle | https://www.gutefrage.net/frage/energy-drink-gesucht-wo-finde-ich-ihn-noch |
| Snacks für lange Fahrten / Onigiri | Unterwegs-Konsum / Produktvorschlag | Mittel: passt zum Unterwegs-Anlass, aber kein expliziter Wunsch an Tankstellen | https://www.reddit.com/r/VeganDE/comments/1n08jma |
| Vegane Verfügbarkeit unterwegs | wahrgenommene Sortimentslücke | Mittel bis hoch: Tankstellen werden explizit als Ort mit begrenzter Auswahl genannt; Diskussion ist breiter und nicht jede Antwort ist ein Kaufwunsch | https://www.reddit.com/r/VeganDE/comments/1uvm0ka/ist_die_verf%C3%BCgbarkeit_im_alltag_das_was_die/ |
| Vegane Snacks an Raststätten | Sortimentslücke / Reisebedarf | Mittel: konkrete Unterwegs-Situation, aber älter | https://www.reddit.com/r/VeganDE/comments/xvqkmi |

## Falschpositive / Beispiele für notwendige Filter

- Allgemeine Fragen zu Energy-Drink-Altersgrenzen oder Preisen: Tankstellenbezug vorhanden, aber kein Sortimentswunsch.
- Glutenfreie Restaurantfragen ohne Tankstellenbezug: Produkt-/Ernährungsinteresse, aber nicht relevant für Tankstellensortimente.
- Allgemeine Snack- oder Ernährungsdiskussionen: können Ideen liefern, dürfen aber nicht als konkrete Nachfrage gewertet werden.
- Beiträge über ein Produkt, das jemand mag oder vermisst, ohne Bezug zu Einkauf unterwegs: nur schwaches Signal.

## Erkenntnisse für die Produktlogik

1. **Intent getrennt klassifizieren:** konkrete Suche / vermisstes Produkt / Sortimentsfrage / allgemeine Empfehlung / reine Meinung.
2. **Ortsbezug separat erfassen:** Tankstelle / Raststätte / Kiosk / unterwegs / kein Bezug.
3. **Aktualität berücksichtigen:** alte Beiträge bleiben auffindbar, dürfen aber nicht denselben Stellenwert wie neue Beiträge erhalten.
4. **Kaufabsicht nicht unterstellen:** „Gibt es das?“ ist ein schwächeres Signal als „Ich suche X und würde es an Tankstelle Y kaufen“.
5. **Dubletten nicht als Nachfrage zählen:** mehrere Kommentare im selben Thread sind nicht mehrere unabhängige Kunden.
6. **Quellenqualität sichtbar machen:** Original-Link, Datum und Signaltyp anzeigen; keine scheinpräzisen Nachfragezahlen.
7. **Keine automatische Bewertung als Umsatzchance:** erst Betreiber-Test und echte Absatzdaten können eine wirtschaftliche Chance bestätigen.

## Technische Bewertung des Prototyps

Der aktuelle HTML-Prototyp ist eine Suchlink-Oberfläche. Er erzeugt Suchanfragen, lädt aber keine Forenbeiträge selbst, speichert keine Inhalte und ruft keine KI auf. Die manuelle Recherche zeigt, dass der Ansatz als Quellenfinder funktioniert. Sie belegt noch nicht, dass eine zuverlässige Vollautomatisierung über die vorgesehenen Plattformen möglich oder erlaubt ist.

## Empfehlung

Den Prototyp nicht direkt automatisieren. Als nächsten Test einen kleinen, manuell geprüften Datensatz mit 30–50 Fundstellen aufbauen und anhand der obigen Kriterien bewerten. Erst wenn ein ausreichend hoher Anteil echte, tankstellenrelevante Wünsche liefert, eine zulässige API-/RSS-Anbindung untersuchen.

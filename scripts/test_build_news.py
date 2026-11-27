import unittest

from scripts.build_news import classify, is_duplicate, useful_summary, article_summary


class NewsQualityTests(unittest.TestCase):
    def test_keeps_direct_tankstellen_convenience_topic(self):
        self.assertEqual(
            classify("Gen Z: Convenience wird für Tankstellenshops wichtiger"),
            "Shop & Sortiment",
        )

    def test_keeps_warenwirtschaft_topic(self):
        self.assertEqual(
            classify("Tankstellen: Wareneinsatz und Rohertrag im Shop verbessern"),
            "Warenwirtschaft & Ertrag",
        )

    def test_keeps_staffing_topic(self):
        self.assertEqual(
            classify("Tankstellenbetreiber: Neue Regeln zu Arbeitszeit und Personal"),
            "Personal, Betrieb & Regulierung",
        )

    def test_rejects_unrelated_products(self):
        self.assertIsNone(classify("Markt für warme Kinderregenjacken wächst bis 2035"))

    def test_rejects_event_technology_without_station_relevance(self):
        self.assertIsNone(classify("IBTM World baut Veranstaltungstechnologie aus"))

    def test_rejects_health_risk_headlines(self):
        self.assertIsNone(
            classify("Kaffee: Studie warnt vor Speiseröhrenkrebs durch hohe Trinktemperatur")
        )

    def test_rejects_generic_live_event_story(self):
        self.assertIsNone(classify("AEG-Studie: Live-Fans wollen mehr Veranstaltungen besuchen"))

    def test_rejects_headline_only_feed_description(self):
        self.assertEqual(
            useful_summary(
                "Gen Z: Convenience wird für Tankstellenshops wichtiger",
                "Gen Z: Convenience wird für Tankstellenshops wichtiger Lebensmittelpraxis.de",
                "Lebensmittelpraxis.de",
            ),
            "",
        )

    def test_accepts_informative_source_description(self):
        description = (
            "Die Untersuchung zeigt, dass jüngere Käufer häufiger spontan zu Snacks "
            "und Getränken greifen. Besonders kurze Einkaufswege und gut sichtbare "
            "Sortimente beeinflussen die Auswahl am Verkaufsort."
        )
        self.assertTrue(useful_summary("Convenience im Tankstellenshop", description))

    def test_extracts_publisher_meta_description(self):
        html = b'<html><head><meta property="og:description" content="Die Studie zeigt neue Entwicklungen im Tankstellenshop und beschreibt konkrete Auswirkungen auf Sortiment, Nachfrage und Einkaufsverhalten."></head></html>'
        self.assertIn("Die Studie zeigt", article_summary("https://example.test/article", lambda _: html))

    def test_ignores_short_or_missing_meta_description(self):
        html = b'<html><head><meta name="description" content="Zu kurz"></head></html>'
        self.assertEqual(article_summary("https://example.test/article", lambda _: html), "")

    def test_detects_near_duplicate_headlines(self):
        self.assertTrue(
            is_duplicate(
                "Tankstellen: Studie zum Kaufverhalten bei Snacks und Getränken",
                ["Studie zum Kaufverhalten bei Getränken und Snacks an Tankstellen"],
            )
        )

    def test_keeps_distinct_headlines(self):
        self.assertFalse(
            is_duplicate(
                "Tankstellen: Neue Regeln zur Arbeitszeit",
                ["Convenience: Neue Studie zum Kaufverhalten bei Getränken"],
            )
        )


if __name__ == "__main__":
    unittest.main()

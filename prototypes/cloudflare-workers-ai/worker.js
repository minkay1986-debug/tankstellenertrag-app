/**
 * Isolated Cloudflare Workers AI prototype.
 *
 * NOT connected to the app and NOT deployed.
 * Defaults to disabled. Use synthetic test questions only.
 * Bind env.AI in a private Cloudflare test Worker to try inference.
 */
const MAX_QUESTION_LENGTH = 1000;
const MODEL = "@cf/zai-org/glm-4.7-flash";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/prototype/ask") {
      return new Response("Not found", { status: 404 });
    }

    // Explicit opt-in required in the isolated Cloudflare test environment.
    if (env.AI_PROTOTYPE_ENABLED !== "true") {
      return Response.json({ error: "prototype_disabled" }, { status: 503 });
    }

    // A separate random test token must be configured as a secret before use.
    const expectedToken = env.PROTOTYPE_TEST_TOKEN;
    const suppliedToken = request.headers.get("Authorization")?.replace(/^Bearer\\s+/i, "");
    if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const question = typeof body?.question === "string" ? body.question.trim() : "";
    // Prototype deliberately accepts only a small, synthetic, explicitly labelled context.
    const context = body?.syntheticContext;
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      return Response.json({ error: "invalid_question" }, { status: 400 });
    }
    if (body?.testMode !== true || context?.synthetic !== true) {
      return Response.json({ error: "synthetic_test_data_required" }, { status: 400 });
    }

    const safeContext = {
      period: String(context.period ?? "Testmonat").slice(0, 40),
      shopRevenueEur: finiteOrNull(context.shopRevenueEur),
      shopGrossProfitEur: finiteOrNull(context.shopGrossProfitEur),
      groups: Array.isArray(context.groups)
        ? context.groups.slice(0, 12).map((group) => ({
            name: String(group?.name ?? "Unbenannte Testgruppe").slice(0, 50),
            revenueEur: finiteOrNull(group?.revenueEur),
            marginPercent: finiteOrNull(group?.marginPercent),
            dataStatus: ["valid", "missing", "entered_zero", "unverified"].includes(group?.dataStatus)
              ? group.dataStatus
              : "missing",
          }))
        : [],
    };

    if (!env.AI || typeof env.AI.run !== "function") {
      return Response.json({ error: "workers_ai_binding_missing" }, { status: 503 });
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: [
              "Du bist ein natürlicher, vorsichtiger Warenwirtschaftsberater für Tankstellenpächter. Antworte auf Deutsch, freundlich, klar und konkret – nicht wie ein FAQ und nicht mit starren Textbausteinen.",
              "Verstehe zuerst die Absicht hinter der Alltagssprache. Gleiche Fragen können sehr unterschiedlich formuliert sein. Erkläre kurz, worauf du dich beziehst, statt Schlüsselwörter oder interne Kategorien aufzuzählen.",
              "Wenn die Frage mehrere plausible Bedeutungen hat und die Antwort davon abhängt, stelle genau eine kurze, hilfreiche Rückfrage. Rate nicht. Wenn nur ein Teil unklar ist, beantworte den sicheren Teil und frage anschließend gezielt nach.",
              "Wenn die Frage klar ist, antworte direkt und vermeide unnötige Rückfragen. Gib bei einer sinnvollen Frage nach Möglichkeit eine kurze Einordnung und konkrete nächste Prüfschritte.",
              "Nutze ausschließlich die übergebenen, ausdrücklich synthetischen Daten. Erfinde keine Zahlen, Daten, Ursachen, Branchenbenchmarks, Studien, Quellen oder Fähigkeiten der App. Berechne keine Kennzahlen neu.",
              "Unterscheide fehlende Werte, gültige Nullwerte und ungeprüfte Importe. Ein fehlender Einkaufspreis ist nicht dasselbe wie null Einkaufskosten. Nenne klar, welche Schlussfolgerung wegen fehlender oder unzuverlässiger Daten nicht möglich ist.",
              "Trenne Fakten aus den Daten von möglichen Erklärungen. Eine Korrelation beweist keine Ursache; Schwund beweist keinen Diebstahl. Formuliere unbestätigte Erklärungen ausdrücklich als Hypothesen.",
              "Gib keine verbindliche Rechts-, Steuer- oder Personalrechtsberatung. Bei solchen Fragen erkläre die allgemeine Grenze und verweise auf eine qualifizierte Stelle, wenn eine konkrete verbindliche Beurteilung nötig ist.",
              "Keine generischen Einleitungen wie 'Als KI'. Keine Behauptung, du hättest Live-Daten, die Datenbank, frühere Gespräche oder externe Quellen geprüft, wenn diese nicht übergeben wurden.",
              "Antworte normalerweise in 2 bis 6 kurzen Sätzen. Bei einer Rückfrage halte die Antwort kurz. Nenne verwendete Testdaten nur, wenn sie für die Antwort relevant sind."
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({ question, validatedSyntheticContext: safeContext }),
          },
        ],
        max_tokens: 350,
      });

      const answer = typeof result?.response === "string" ? result.response.trim() : "";
      if (!answer) {
        return Response.json({ error: "empty_model_response" }, { status: 502 });
      }
      return Response.json({ answer, model: MODEL, prototype: true });
    } catch {
      // Do not return provider internals, request payloads, or credentials to clients.
      return Response.json({ error: "model_unavailable" }, { status: 502 });
    }
  },
};

function finiteOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

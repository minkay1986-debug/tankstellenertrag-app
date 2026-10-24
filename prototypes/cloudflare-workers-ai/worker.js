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
    const suppliedToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
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
              "Du bist ein vorsichtiger Analyseassistent für einen synthetischen Tankstellen-Test.",
              "Nutze ausschließlich die übergebenen Daten. Berechne keine Kennzahlen neu.",
              "Erfinde keine Ursachen, Werte oder Vergleiche.",
              "Unterscheide fehlende Werte, gültige Nullwerte und ungeprüfte Importe.",
              "Wenn Daten fehlen, sage klar, was nicht beurteilt werden kann.",
              "Gib eine kurze Antwort auf Deutsch und nenne die verwendeten Daten.",
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

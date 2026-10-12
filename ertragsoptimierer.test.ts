import "./ertragsoptimierer.js";

const optimizer = (globalThis as any).TankstellenErtragsoptimierer;

if (!optimizer) throw new Error("Ertragsoptimierer API wurde nicht geladen");

Deno.test("missing actual revenue stays missing instead of becoming zero", () => {
  const result = optimizer.evaluateGroup({
    name: "Getränke",
    actualRevenue: null,
    previousRevenue: 1000,
    priorYearRevenue: 1200,
    dataComplete: false,
  });
  if (result.actualRevenue !== null) throw new Error("Missing revenue was treated as a value");
  if (result.varianceEuro !== null) throw new Error("Variance was calculated without actual revenue");
  if (!result.alerts.some((a: any) => a.code === "MISSING_ACTUAL")) throw new Error("Missing-data warning absent");
});

Deno.test("comparison baseline and revenue variance are calculated transparently", () => {
  const result = optimizer.evaluateGroup({
    name: "Kaffee",
    actualRevenue: 900,
    previousRevenue: 1000,
    priorYearRevenue: 800,
    marginPct: 55,
    previousMarginPct: 58,
    shrinkPct: 1,
    dataComplete: true,
  });
  // Baseline is the mean of the two available comparison periods: 900.
  if (result.expectedRevenue !== 900) throw new Error(`Expected 900, got ${result.expectedRevenue}`);
  if (result.varianceEuro !== 0) throw new Error(`Expected zero variance, got ${result.varianceEuro}`);
  if (result.marginDeltaPp !== -3) throw new Error(`Expected -3 percentage points, got ${result.marginDeltaPp}`);
});

Deno.test("weather learning requires comparable sample counts and excludes promotions", () => {
  const observations = [
    ...Array.from({ length: 3 }, (_, i) => ({ groupKey: "eis", actualRevenue: 150, maxTempC: 28, date: `warm-${i}` })),
    ...Array.from({ length: 3 }, (_, i) => ({ groupKey: "eis", actualRevenue: 100, maxTempC: 20, date: `mild-${i}` })),
    { groupKey: "eis", actualRevenue: 999, maxTempC: 30, promotion: true },
    { groupKey: "eis", actualRevenue: 999, maxTempC: 30, complete: false },
  ];
  const [result] = optimizer.learnWeatherEffects(observations);
  if (result.warmObservationCount !== 3 || result.mildObservationCount !== 3) {
    throw new Error("Invalid observations were included in weather learning");
  }
  if (result.warmVsMildPct !== 50 || result.warmSignal !== "preliminary") {
    throw new Error("Expected a preliminary +50% warm-weather signal");
  }
});

Deno.test("weather learning does not report a signal with too few observations", () => {
  const result = optimizer.learnWeatherEffects([
    { groupKey: "backwaren", actualRevenue: 100, maxTempC: 27 },
    { groupKey: "backwaren", actualRevenue: 90, maxTempC: 20 },
  ])[0];
  if (result.warmVsMildPct !== null || result.warmSignal !== "insufficient_data") {
    throw new Error("Insufficient samples must not create a weather effect");
  }
});

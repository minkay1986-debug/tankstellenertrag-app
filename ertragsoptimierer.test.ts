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

Deno.test("daily sales are matched only to the exact valid weather date", () => {
  const weather = [
    { date: "2026-06-01", temp_max: 28 },
    { date: "2026-06-02", temp_max: 20 },
  ];
  const sales = [
    { date: "2026-06-01", groupKey: "eis", actualRevenue: 150, complete: true, open: true, promotion: false },
    { date: "2026-06-02", groupKey: "eis", actualRevenue: 100, complete: true, open: true, promotion: false },
    { date: "2026-06-03", groupKey: "eis", actualRevenue: 999, complete: true, open: true, promotion: false },
    { date: "2026-02-30", groupKey: "eis", actualRevenue: 999, complete: true, open: true, promotion: false },
    { date: "2026-06-01", groupKey: "eis", actualRevenue: 999, complete: true, open: false, promotion: false },
    { date: "2026-06-01", groupKey: "eis", actualRevenue: 999, complete: true, open: true, promotion: true },
  ];
  const matched = optimizer.matchWeatherSalesObservations(weather, sales);
  if (matched.length !== 2) throw new Error(`Expected two valid exact-date matches, got ${matched.length}`);
  if (matched.some((row: any) => row.date === "2026-06-03" || row.date === "2026-02-30")) {
    throw new Error("Unmatched or invalid calendar dates were included");
  }
});

Deno.test("dated weather learning compares within weekday and quarter strata", () => {
  const pairs: [string, number, number][] = [
    ["2026-04-06", 28, 120],
    ["2026-04-13", 27, 120],
    ["2026-04-20", 29, 120],
    ["2026-05-04", 20, 100],
    ["2026-05-11", 21, 100],
    ["2026-05-18", 22, 100],
  ];
  const weather = pairs.map(([date, temp]) => ({ date, temp_max: temp }));
  const sales = pairs.map(([date, , revenue]) => ({
    date, groupKey: "drinks", actualRevenue: revenue,
    complete: true, open: true, promotion: false,
  }));
  const [result] = optimizer.learnWeatherEffects(optimizer.matchWeatherSalesObservations(weather, sales));
  if (result.comparisonMethod !== "weekday_and_quarter_matched") {
    throw new Error("Dated learning did not use weekday/quarter matching");
  }
  if (result.warmSignal !== "preliminary" || result.warmVsMildPct !== 20) {
    throw new Error(`Expected preliminary +20% signal, got ${result.warmVsMildPct}`);
  }
});

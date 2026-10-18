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
    ...Array.from({ length: 3 }, (_, i) => ({ groupKey: "eis", actualRevenue: 150, maxTempC: 28, date: ["2024-07-06", "2025-07-05", "2026-07-04"][i] })),
    ...Array.from({ length: 3 }, (_, i) => ({ groupKey: "eis", actualRevenue: 100, maxTempC: 20, date: ["2024-07-13", "2025-07-12", "2026-07-11"][i] })),
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
    { groupKey: "backwaren", actualRevenue: 100, maxTempC: 27, date: "2026-07-04" },
    { groupKey: "backwaren", actualRevenue: 90, maxTempC: 20, date: "2026-07-11" },
  ])[0];
  if (result.warmVsMildPct !== null || result.warmSignal !== "insufficient_data") {
    throw new Error("Insufficient samples must not create a weather effect");
  }
});

Deno.test("weather learning matches station sales to the exact DWD date and filters unsafe samples", () => {
  const weather = [
    { date: "2026-07-01", temp_max: 28, temp_min: 17, precipitation_mm: 0 },
    { date: "2026-04-01", temp_max: 20, temp_min: 9, precipitation_mm: 2 },
    { date: "2026-07-02", temp_max: 30, temp_min: 18, precipitation_mm: 0 },
  ];
  const sales = [
    { date: "2026-07-01", groupKey: "eis", actualRevenue: 150 },
    { date: "2026-04-01", groupKey: "eis", actualRevenue: 100 },
    { date: "2026-07-02", groupKey: "eis", actualRevenue: 180, promotion: true },
    { date: "2026-07-03", groupKey: "eis", actualRevenue: 999 },
    { date: "2026-07-01", groupKey: "eis", actualRevenue: 999, complete: false },
    { date: "2026-07-01", groupKey: "eis", actualRevenue: 999, open: false },
  ];
  const matched = optimizer.matchWeatherSalesObservations(weather, sales);
  if (matched.length !== 2) throw new Error(`Expected 2 valid date-matched observations, got ${matched.length}`);
  if (matched[0].maxTempC !== 28 || matched[0].actualRevenue !== 150) throw new Error("Weather and revenue were not paired by exact date");
  if (matched.some((x: any) => x.actualRevenue === 999)) throw new Error("Invalid/incomplete/promotion observations were retained");
});

Deno.test("weather matching never fabricates observations when weather or daily revenue is missing", () => {
  const matched = optimizer.matchWeatherSalesObservations(
    [{ date: "2026-07-01", temp_max: 28 }],
    [{ date: "2026-07-02", groupKey: "eis", actualRevenue: 150 }]
  );
  if (matched.length !== 0) throw new Error("Unmatched date must not be assigned a weather value");
});

Deno.test("synthetic test-station data produces a preliminary signal only after three warm and three mild days", () => {
  const weather = [
    { date: "2024-07-06", temp_max: 28 }, { date: "2025-07-05", temp_max: 29 }, { date: "2026-07-04", temp_max: 27 },
    { date: "2024-07-13", temp_max: 20 }, { date: "2025-07-12", temp_max: 19 }, { date: "2026-07-11", temp_max: 22 },
  ];
  const sales = [
    { date: "2024-07-06", groupKey: "eis", actualRevenue: 150 },
    { date: "2025-07-05", groupKey: "eis", actualRevenue: 160 },
    { date: "2026-07-04", groupKey: "eis", actualRevenue: 140 },
    { date: "2024-07-13", groupKey: "eis", actualRevenue: 100 },
    { date: "2025-07-12", groupKey: "eis", actualRevenue: 110 },
    { date: "2026-07-11", groupKey: "eis", actualRevenue: 90 },
  ];
  const paired = optimizer.matchWeatherSalesObservations(weather, sales);
  const [result] = optimizer.learnWeatherEffects(paired);
  if (paired.length !== 6) throw new Error(`Expected six exact date pairs, got ${paired.length}`);
  if (result.warmObservationCount !== 3 || result.mildObservationCount !== 3) throw new Error("Synthetic station sample counts incorrect");
  if (result.warmVsMildPct !== 50 || result.warmSignal !== "preliminary") throw new Error("Expected synthetic +50% preliminary warm-weather signal");
});


Deno.test("two-year synthetic station run matches every daily record and learns group-specific weather effects", () => {
  // Test fixture only: 2024-01-01 through 2025-12-31. No real customer data is changed.
  const weather: any[] = [];
  const sales: any[] = [];
  const groups = [
    { key: "eis", base: 42, warmBoost: 1.8 },
    { key: "getraenke", base: 210, warmBoost: 1.25 },
    { key: "backshop", base: 165, warmBoost: 0.82 },
    { key: "kaffee", base: 95, warmBoost: 0.72 },
  ];
  const start = Date.UTC(2024, 0, 1);
  const end = Date.UTC(2025, 11, 31);
  let dayIndex = 0;
  for (let ms = start; ms <= end; ms += 86400000, dayIndex++) {
    const date = new Date(ms).toISOString().slice(0, 10);
    // Seasonal daily temperatures with deterministic day-to-day variation.
    const seasonal = 10 + 10 * Math.sin((2 * Math.PI * (dayIndex - 105)) / 365.25);
    const tempMax = Math.round((seasonal + 5 * Math.sin(dayIndex * 1.71) + 4) * 10) / 10;
    const tempMin = Math.round((tempMax - 6 - (dayIndex % 5)) * 10) / 10;
    weather.push({ date, temp_max: tempMax, temp_min: tempMin, precipitation_mm: dayIndex % 4 === 0 ? 2.5 : 0 });
    for (const group of groups) {
      const weekendFactor = [0, 6].includes(new Date(ms).getUTCDay()) ? 1.08 : 1;
      const warmFactor = tempMax >= 25 ? group.warmBoost : 1;
      const seasonalNoise = 1 + 0.08 * Math.sin(dayIndex * 0.43 + group.base);
      const revenue = Math.round(group.base * weekendFactor * warmFactor * seasonalNoise * 100) / 100;
      sales.push({ date, groupKey: group.key, actualRevenue: revenue, complete: true, open: true, promotion: false });
    }
  }
  const paired = optimizer.matchWeatherSalesObservations(weather, sales);
  if (weather.length !== 731) throw new Error(`Expected 731 weather days, got ${weather.length}`);
  if (sales.length !== 2924) throw new Error(`Expected 2,924 daily group records, got ${sales.length}`);
  if (paired.length !== sales.length) throw new Error(`Expected all daily records to match; matched ${paired.length}/${sales.length}`);
  const learned = optimizer.learnWeatherEffects(paired);
  const byGroup = new Map(learned.map((row: any) => [row.groupKey, row]));
  for (const key of groups.map(g => g.key)) {
    const row: any = byGroup.get(key);
    if (!row || row.warmObservationCount < 3 || row.mildObservationCount < 3) {
      throw new Error(`Insufficient two-year learning samples for ${key}`);
    }
    if (row.warmSignal !== "preliminary" || typeof row.warmVsMildPct !== "number") {
      throw new Error(`No preliminary signal generated for ${key}`);
    }
  }
  const ice: any = byGroup.get("eis");
  const drinks: any = byGroup.get("getraenke");
  if (!(ice.warmVsMildPct > drinks.warmVsMildPct)) {
    throw new Error("Expected ice sales to show a stronger warm-weather effect than drinks");
  }
});

Deno.test("learned weather effects reach the expected-revenue calculation only for an explicit supported regime", () => {
  const learned = [{
    groupKey: "eis", warmVsMildPct: 50, warmSignal: "preliminary",
    coolVsMildPct: -10, coolSignal: "preliminary"
  }];
  const base = { groupKey: "eis", name: "Eis", actualRevenue: 100, previousRevenue: 100, priorYearRevenue: 100 };
  const warm = optimizer.analyze({ groups: [base], weatherLearning: learned, weatherRegime: "warm" });
  if (warm.priorities[0].expectedRevenue !== 120) throw new Error("Warm learning effect must be capped at +20%");
  const cool = optimizer.analyze({ groups: [base], weatherLearning: learned, weatherRegime: "cool" });
  if (cool.priorities[0].expectedRevenue !== 90) throw new Error("Cool learning effect should adjust baseline by -10%");
  const mild = optimizer.analyze({ groups: [base], weatherLearning: learned, weatherRegime: "mild" });
  if (mild.priorities[0].expectedRevenue !== 100) throw new Error("Mild regime must not apply warm/cool effects");
  const noLearning = optimizer.analyze({ groups: [base] });
  if (noLearning.priorities[0].expectedRevenue !== 100) throw new Error("Legacy analysis must remain unchanged without learning input");
});

Deno.test("learned weather effect is not applied when sample status is insufficient and group keys must match", () => {
  const learned = [
    { groupKey: "eis", warmVsMildPct: 18, warmSignal: "insufficient_data" },
    { groupKey: "kaffee", warmVsMildPct: 12, warmSignal: "preliminary" }
  ];
  const groups = [
    { groupKey: "eis", actualRevenue: 100, previousRevenue: 100 },
    { groupKey: "getraenke", actualRevenue: 200, previousRevenue: 200 }
  ];
  const result = optimizer.analyze({ groups, weatherLearning: learned, weatherRegime: "warm" });
  if (result.priorities.some((row: any) => row.expectedRevenue !== row.actualRevenue)) {
    throw new Error("Insufficient or unmatched learning data must not alter expected revenue");
  }
});


Deno.test("weekday-only revenue differences must not be learned as a weather effect", () => {
  // Warm observations are Saturdays with higher sales; mild observations are Sundays.
  // Because there are no same-weekday comparisons, the learner must abstain.
  const observations = [
    ...["2024-07-06", "2024-07-13", "2024-07-20"].map(date => ({
      groupKey: "eis", date, actualRevenue: 180, maxTempC: 29
    })),
    ...["2024-07-07", "2024-07-14", "2024-07-21"].map(date => ({
      groupKey: "eis", date, actualRevenue: 100, maxTempC: 20
    }))
  ];
  const [result] = optimizer.learnWeatherEffects(observations);
  if (result.warmSignal !== "insufficient_data" || result.warmVsMildPct !== null) {
    throw new Error("Weekday imbalance must not create a weather signal");
  }
});

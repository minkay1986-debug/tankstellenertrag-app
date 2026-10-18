/**
 * TankstellenErtrag – Ertragsoptimierer (erklärbarer Prognosekern)
 * Version 0.2.0
 *
 * Reine Berechnungen ohne Netzwerkzugriff und ohne automatische Preis-/Sortimentsänderung.
 * Erwartete Warengruppen-Datensätze:
 * { name, actualRevenue, previousRevenue?, priorYearRevenue?, marginPct?,
 *   previousMarginPct?, shrinkPct?, weatherEffectPct?, seasonEffectPct?,
 *   comparableDays?, dataComplete? }
 *
 * weatherEffectPct / seasonEffectPct sind optionale, bereits fachlich begründete
 * Schätzwerte in Prozent. Sie werden NICHT aus Wetterdaten automatisch erfunden.
 */
(function (root) {
  'use strict';

  const finite = (v) => typeof v === 'number' && Number.isFinite(v);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const isIsoCalendarDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(value + 'T12:00:00Z');
    return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  };
  const round = (v, digits = 2) => {
    const f = 10 ** digits;
    return Math.round((v + Number.EPSILON) * f) / f;
  };

  function evaluateGroup(group) {
    const g = group || {};
    const actual = finite(g.actualRevenue) && g.actualRevenue >= 0 ? g.actualRevenue : null;
    const prev = finite(g.previousRevenue) && g.previousRevenue >= 0 ? g.previousRevenue : null;
    const year = finite(g.priorYearRevenue) && g.priorYearRevenue >= 0 ? g.priorYearRevenue : null;
    const margin = finite(g.marginPct) ? g.marginPct : null;
    const previousMargin = finite(g.previousMarginPct) ? g.previousMarginPct : null;
    const shrink = finite(g.shrinkPct) ? g.shrinkPct : null;
    const weather = finite(g.weatherEffectPct) ? clamp(g.weatherEffectPct, -50, 50) : 0;
    const season = finite(g.seasonEffectPct) ? clamp(g.seasonEffectPct, -50, 50) : 0;

    const available = [prev, year].filter(v => v !== null);
    const baseline = available.length
      ? available.reduce((sum, value) => sum + value, 0) / available.length
      : null;
    const trendPct = prev !== null && prev > 0 && actual !== null
      ? (actual / prev - 1) * 100 : null;
    const yearPct = year !== null && year > 0 && actual !== null
      ? (actual / year - 1) * 100 : null;

    // External effects adjust the baseline only when explicitly supplied.
    const expectedRevenue = baseline !== null
      ? baseline * (1 + (weather + season) / 100) : null;
    const varianceEuro = expectedRevenue !== null && actual !== null
      ? actual - expectedRevenue : null;
    const variancePct = expectedRevenue !== null && expectedRevenue > 0 && actual !== null
      ? (actual / expectedRevenue - 1) * 100 : null;
    const marginDelta = margin !== null && previousMargin !== null
      ? margin - previousMargin : null;

    const alerts = [];
    if (variancePct !== null && variancePct <= -10) {
      alerts.push({ level: 'high', code: 'REVENUE_BELOW_EXPECTATION',
        title: 'Absatz/Umsatz deutlich unter Erwartung',
        detail: 'Ursachen wie Verfügbarkeit, Preis, Wettbewerb und Vergleichbarkeit prüfen.' });
    } else if (variancePct !== null && variancePct <= -5) {
      alerts.push({ level: 'medium', code: 'REVENUE_SOFTENING',
        title: 'Umsatz unter Erwartung',
        detail: 'Entwicklung im nächsten vergleichbaren Zeitraum erneut prüfen.' });
    }
    if (marginDelta !== null && marginDelta <= -2) {
      alerts.push({ level: 'high', code: 'MARGIN_DROP',
        title: 'Margenrückgang',
        detail: 'Einkaufspreise, Verkaufspreise, Rabatte und Wareneinsatz abgleichen.' });
    }
    if (shrink !== null && shrink > 2) {
      alerts.push({ level: shrink > 4 ? 'high' : 'medium', code: 'SHRINK_REVIEW',
        title: 'Schwund/Abschriften prüfen',
        detail: 'Inventur, Buchungen und Abschriften nach Warengruppe kontrollieren.' });
    }
    if (actual === null) {
      alerts.push({ level: 'info', code: 'MISSING_ACTUAL',
        title: 'Aktueller Umsatz fehlt',
        detail: 'Keine Prognoseabweichung berechnet, bis ein gültiger Wert vorliegt.' });
    }
    if (baseline === null) {
      alerts.push({ level: 'info', code: 'INSUFFICIENT_HISTORY',
        title: 'Historische Vergleichswerte fehlen',
        detail: 'Mindestens ein vergleichbarer Vorperioden- oder Vorjahreswert wird benötigt.' });
    }
    if (g.dataComplete === false) {
      alerts.push({ level: 'info', code: 'INCOMPLETE_DATA',
        title: 'Datengrundlage unvollständig',
        detail: 'Ergebnisse als vorläufig behandeln; fehlende Werte nicht als null interpretieren.' });
    }

    const confidence = baseline === null || actual === null ? 'low'
      : (prev !== null && year !== null && g.dataComplete !== false ? 'medium' : 'low');

    return {
      name: typeof g.name === 'string' && g.name.trim() ? g.name.trim() : 'Warengruppe',
      actualRevenue: actual === null ? null : round(actual),
      expectedRevenue: expectedRevenue === null ? null : round(expectedRevenue),
      varianceEuro: varianceEuro === null ? null : round(varianceEuro),
      variancePct: variancePct === null ? null : round(variancePct),
      trendPct: trendPct === null ? null : round(trendPct),
      priorYearPct: yearPct === null ? null : round(yearPct),
      marginPct: margin === null ? null : round(margin),
      marginDeltaPp: marginDelta === null ? null : round(marginDelta),
      shrinkPct: shrink === null ? null : round(shrink),
      confidence,
      alerts
    };
  }

  /**
   * Lernt vorsichtige, stationsinterne Wettersignale aus gepaarten Beobachtungen.
   * Jede Beobachtung muss tatsächlichen Warengruppenumsatz und Wetter desselben
   * Zeitraums enthalten. Nicht für eine automatische Umsatzprognose verwenden,
   * bevor Datenqualität und Vergleichbarkeit geprüft wurden.
   *
   * Observation: { groupKey, actualRevenue, maxTempC, minTempC?, precipitationMm?,
   *   date?, promotion?, complete?, open? }
   */
  function learnWeatherEffects(observations) {
    const rows = Array.isArray(observations) ? observations.filter(o =>
      o && typeof o.groupKey === 'string' && o.groupKey.trim() &&
      finite(o.actualRevenue) && o.actualRevenue >= 0 &&
      finite(o.maxTempC) && o.complete !== false && o.open !== false &&
      o.promotion !== true
    ).map(o => {
      const hasDate = isIsoCalendarDate(o.date);
      const d = hasDate ? new Date(o.date + 'T12:00:00Z') : null;
      return { ...o, _hasDate: hasDate,
        _weekday: d ? d.getUTCDay() : null,
        _season: d ? Math.floor(d.getUTCMonth() / 3) : null };
    }) : [];
    const groups = [...new Set(rows.map(o => o.groupKey.trim()))];
    return groups.map(groupKey => {
      const own = rows.filter(o => o.groupKey.trim() === groupKey);
      const warm = own.filter(o => o.maxTempC >= 25);
      const mild = own.filter(o => o.maxTempC >= 16 && o.maxTempC < 25);
      const cool = own.filter(o => o.maxTempC <= 15);
      const mean = list => list.length ? list.reduce((sum, o) => sum + o.actualRevenue, 0) / list.length : null;
      const effect = (a, b) => b !== null && b > 0 && a !== null ? round((a / b - 1) * 100) : null;

      // The portal always supplies dates via matchWeatherSalesObservations.
      // Keep the legacy date-less input contract for existing unit tests and callers.
      if (!own.length || !own.every(o => o._hasDate)) {
        const enoughWarm = warm.length >= 3 && mild.length >= 3;
        const enoughCool = cool.length >= 3 && mild.length >= 3;
        return {
          groupKey, observationCount: own.length,
          warmObservationCount: warm.length, mildObservationCount: mild.length, coolObservationCount: cool.length,
          warmVsMildPct: enoughWarm ? effect(mean(warm), mean(mild)) : null,
          coolVsMildPct: enoughCool ? effect(mean(cool), mean(mild)) : null,
          warmSignal: enoughWarm ? 'preliminary' : 'insufficient_data',
          coolSignal: enoughCool ? 'preliminary' : 'insufficient_data',
          note: 'Vorläufiger Zusammenhang, kein Kausalnachweis. Für belastbare Aussagen müssen Wochentag, Saison, Aktionen und Preisänderungen geprüft werden.'
        };
      }

      const bins = { warm: o => o.maxTempC >= 25, mild: o => o.maxTempC >= 16 && o.maxTempC < 25,
        cool: o => o.maxTempC <= 15 };
      const strata = new Map();
      for (const o of own) {
        const key = o._weekday + ':' + o._season;
        if (!strata.has(key)) strata.set(key, []);
        strata.get(key).push(o);
      }
      const compare = regime => {
        const matched = [];
        for (const list of strata.values()) {
          const hot = list.filter(bins[regime]);
          const moderate = list.filter(bins.mild);
          if (hot.length && moderate.length) matched.push({ hot, mild: moderate });
        }
        const hotCount = matched.reduce((n, x) => n + x.hot.length, 0);
        const mildCount = matched.reduce((n, x) => n + x.mild.length, 0);
        const usable = hotCount >= 3 && mildCount >= 3 && matched.length >= 1;
        if (!usable) return { effect: null, hotCount, mildCount, matchedStrata: matched.length, status: 'insufficient_data' };
        const effects = matched.map(x => {
          const hotMean = mean(x.hot), mildMean = mean(x.mild);
          return mildMean > 0 ? (hotMean / mildMean - 1) * 100 : null;
        }).filter(finite);
        if (!effects.length) return { effect: null, hotCount, mildCount, matchedStrata: matched.length, status: 'insufficient_data' };
        return { effect: round(effects.reduce((sum, x) => sum + x, 0) / effects.length),
          hotCount, mildCount, matchedStrata: matched.length, status: 'preliminary' };
      };
      const warmResult = compare('warm'), coolResult = compare('cool');
      return {
        groupKey, observationCount: own.length,
        warmObservationCount: warm.length, mildObservationCount: mild.length, coolObservationCount: cool.length,
        warmMatchedObservationCount: warmResult.hotCount, mildMatchedForWarmCount: warmResult.mildCount,
        warmMatchedStrata: warmResult.matchedStrata,
        coolMatchedObservationCount: coolResult.hotCount, mildMatchedForCoolCount: coolResult.mildCount,
        coolMatchedStrata: coolResult.matchedStrata,
        warmVsMildPct: warmResult.effect, coolVsMildPct: coolResult.effect,
        warmSignal: warmResult.status, coolSignal: coolResult.status,
        comparisonMethod: 'weekday_and_quarter_matched',
        note: 'Vorläufiger Zusammenhang: Vergleich nur innerhalb gleicher Wochentage und Quartale. Aktionen sowie unvollständige/geschlossene Tage ausgeschlossen. Preisänderungen, Feiertage und weitere Einflüsse sind nicht kontrolliert; kein Kausalnachweis.'
      };
    });
  }

  function matchWeatherSalesObservations(weatherDaily, salesObservations) {
    const weatherByDate = new Map((Array.isArray(weatherDaily) ? weatherDaily : [])
      .filter(w => w && isIsoCalendarDate(w.date) && finite(w.temp_max))
      .map(w => [w.date, w]));
    // One daily revenue record per date/group is expected. If upstream sends
    // duplicates, use the last valid record deterministically rather than
    // counting the same day more than once in the learner.
    const salesByKey = new Map();
    for (const s of (Array.isArray(salesObservations) ? salesObservations : [])) {
      if (!s || !isIsoCalendarDate(s.date) || typeof s.groupKey !== 'string' ||
          !s.groupKey.trim() || !finite(s.actualRevenue) || s.actualRevenue < 0 ||
          s.complete === false || s.open === false || s.promotion === true) continue;
      const key = s.date + ':' + s.groupKey.trim();
      salesByKey.set(key, { ...s, groupKey: s.groupKey.trim() });
    }
    return [...salesByKey.values()].flatMap(s => {
      const w = weatherByDate.get(s.date);
      if (!w || !finite(w.temp_max)) return [];
      return [{ groupKey: s.groupKey, date: s.date, actualRevenue: s.actualRevenue,
        maxTempC: w.temp_max,
        minTempC: finite(w.temp_min) && w.temp_min <= w.temp_max ? w.temp_min : undefined,
        precipitationMm: finite(w.precipitation_mm) && w.precipitation_mm >= 0 ? w.precipitation_mm : undefined,
        promotion: false, complete: true, open: true }];
    });
  }

  function applyLearnedWeatherEffects(groups, learned, regime) {
    const rows = Array.isArray(groups) ? groups : [];
    const effects = new Map((Array.isArray(learned) ? learned : [])
      .filter(row => row && typeof row.groupKey === 'string')
      .map(row => [row.groupKey.trim(), row]));
    const validRegime = regime === 'warm' || regime === 'cool' ? regime : 'mild';
    return rows.map(group => {
      const g = group || {};
      const key = typeof g.groupKey === 'string' ? g.groupKey.trim()
        : typeof g.name === 'string' ? g.name.trim() : '';
      const signal = effects.get(key);
      const raw = validRegime === 'warm' ? signal?.warmVsMildPct
        : validRegime === 'cool' ? signal?.coolVsMildPct : null;
      const status = validRegime === 'warm' ? signal?.warmSignal
        : validRegime === 'cool' ? signal?.coolSignal : 'not_applied';
      const usable = status === 'preliminary' && finite(raw);
      const effectPct = usable ? clamp(raw, -20, 20) : 0;
      return {
        ...g,
        weatherEffectPct: effectPct,
        weatherLearningApplied: usable,
        weatherLearningRegime: validRegime,
        weatherLearningSignalPct: usable ? round(raw) : null
      };
    });
  }

  function analyze(input) {
    const suppliedGroups = Array.isArray(input && input.groups) ? input.groups : [];
    const groupsForEvaluation = input && Array.isArray(input.weatherLearning)
      ? applyLearnedWeatherEffects(suppliedGroups, input.weatherLearning, input.weatherRegime)
      : suppliedGroups;
    const groups = groupsForEvaluation.map(evaluateGroup);
    const scored = groups.map(g => ({
      ...g,
      priorityScore: (g.alerts || []).reduce((s, a) =>
        s + (a.level === 'high' ? 3 : a.level === 'medium' ? 2 : 0.5), 0)
        + (g.varianceEuro !== null && g.varianceEuro < 0 ? Math.min(3, Math.abs(g.varianceEuro) / 1000) : 0)
    })).sort((a, b) => b.priorityScore - a.priorityScore);

    const valid = groups.filter(g => g.actualRevenue !== null);
    const actualTotal = valid.reduce((s, g) => s + g.actualRevenue, 0);
    const expectedTotal = valid.every(g => g.expectedRevenue !== null)
      ? valid.reduce((s, g) => s + g.expectedRevenue, 0) : null;
    const varianceTotal = expectedTotal === null ? null : actualTotal - expectedTotal;

    return {
      version: '0.2.0',
      generatedAt: new Date().toISOString(),
      summary: {
        groupCount: groups.length,
        evaluatedGroupCount: valid.length,
        actualRevenueTotal: round(actualTotal),
        expectedRevenueTotal: expectedTotal === null ? null : round(expectedTotal),
        varianceEuroTotal: varianceTotal === null ? null : round(varianceTotal),
        status: expectedTotal === null ? 'insufficient_data'
          : varianceTotal <= -1 ? 'below_expectation'
          : varianceTotal >= 1 ? 'above_expectation' : 'near_expectation'
      },
      priorities: scored,
      notes: [
        'Erwartungswerte sind einfache Vergleichs-Baselines, keine garantierten Vorhersagen.',
        'Wetter- und Saisonfaktoren werden nur berücksichtigt, wenn sie als Eingabewerte vorliegen.',
        'Empfehlungen sind Prüfhypothesen; keine automatische Änderung von Preisen oder Bestellmengen.',
        'Für belastbare Prognosen müssen Vergleichszeiträume, Öffnungstage, Aktionen und Datenvollständigkeit geprüft werden.'
      ]
    };
  }

  const api = Object.freeze({ version: '0.2.0', evaluateGroup, analyze, learnWeatherEffects, matchWeatherSalesObservations, applyLearnedWeatherEffects });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TankstellenErtragsoptimierer = api;
})(typeof window !== 'undefined' ? window : globalThis);

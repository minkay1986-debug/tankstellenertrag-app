/**
 * TankstellenErtrag – Ertragsoptimierer (erklärbarer Prognosekern)
 * Version 0.1.0
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

  function analyze(input) {
    const groups = Array.isArray(input && input.groups) ? input.groups.map(evaluateGroup) : [];
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
      version: '0.1.0',
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

  const api = Object.freeze({ version: '0.1.0', evaluateGroup, analyze });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TankstellenErtragsoptimierer = api;
})(typeof window !== 'undefined' ? window : globalThis);

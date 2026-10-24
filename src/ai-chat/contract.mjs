/**
 * Provider-neutral guardrails for future AI chat integration.
 * This module does not call a provider and is not wired into the live chat.
 */

export const AI_CHAT_ENABLED = false;
export const AI_QUESTIONS_PER_STATION_PER_MONTH = 3;
export const MAX_QUESTION_LENGTH = 1000;

export function validateQuestion(value) {
  if (typeof value !== "string") {
    return { ok: false, reason: "question_not_string" };
  }

  const question = value.trim();
  if (!question) return { ok: false, reason: "question_empty" };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, reason: "question_too_long" };
  }
  return { ok: true, question };
}

/**
 * Do not infer missingness from a numeric value. Explicit zero is a distinct state.
 */
export function classifyEnteredValue({ entered, value, imported = false, verified = true }) {
  if (imported && !verified) return { state: "unverified_import", value: null };
  if (!entered) return { state: "missing", value: null };

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { state: "invalid", value: null };
  }

  return {
    state: value === 0 ? "entered_zero" : "entered_value",
    value
  };
}

/**
 * A missing comparison period should block only comparative questions, not
 * a question about the current period.
 */
export function canAnswerFromValidatedData({ currentPeriodAvailable, comparisonPeriodAvailable, needsComparison }) {
  if (!currentPeriodAvailable) return false;
  if (needsComparison && !comparisonPeriodAvailable) return false;
  return true;
}

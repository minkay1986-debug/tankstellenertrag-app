import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_CHAT_ENABLED,
  AI_QUESTIONS_PER_STATION_PER_MONTH,
  MAX_QUESTION_LENGTH,
  validateQuestion,
  classifyEnteredValue,
  canAnswerFromValidatedData
} from "../src/ai-chat/contract.mjs";

test("AI remains disabled and quota is deliberately small", () => {
  assert.equal(AI_CHAT_ENABLED, false);
  assert.equal(AI_QUESTIONS_PER_STATION_PER_MONTH, 3);
});

test("question validation rejects empty and oversized input", () => {
  assert.equal(validateQuestion("  ").reason, "question_empty");
  assert.equal(validateQuestion("x".repeat(MAX_QUESTION_LENGTH + 1)).reason, "question_too_long");
  assert.deepEqual(validateQuestion("  Warum ist die Marge gesunken?  "), {
    ok: true,
    question: "Warum ist die Marge gesunken?"
  });
});

test("missing input and explicit zero are not conflated", () => {
  assert.equal(classifyEnteredValue({ entered: false, value: 0 }).state, "missing");
  assert.equal(classifyEnteredValue({ entered: true, value: 0 }).state, "entered_zero");
  assert.equal(classifyEnteredValue({ entered: true, value: 12.5 }).state, "entered_value");
  assert.equal(classifyEnteredValue({ entered: true, value: Infinity }).state, "invalid");
  assert.equal(classifyEnteredValue({ entered: true, value: 5, imported: true, verified: false }).state, "unverified_import");
});

test("comparison data is required only for comparative questions", () => {
  assert.equal(canAnswerFromValidatedData({
    currentPeriodAvailable: true,
    comparisonPeriodAvailable: false,
    needsComparison: false
  }), true);
  assert.equal(canAnswerFromValidatedData({
    currentPeriodAvailable: true,
    comparisonPeriodAvailable: false,
    needsComparison: true
  }), false);
  assert.equal(canAnswerFromValidatedData({
    currentPeriodAvailable: false,
    comparisonPeriodAvailable: true,
    needsComparison: false
  }), false);
});

const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  normalizeQuestions,
  scoreQuiz,
  buildCertificateCode,
} = require("../service/learningQuizService.js");

test("normalizeQuestions validates quiz structure", () => {
  const questions = normalizeQuestions([
    {
      prompt: "What is PTO?",
      options: ["Paid time off", "Personal task owner"],
      correctIndex: 0,
    },
  ]);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].prompt, "What is PTO?");
});

test("scoreQuiz calculates pass/fail based on threshold", () => {
  const questions = [
    { prompt: "Q1", options: ["A", "B"], correctIndex: 0 },
    { prompt: "Q2", options: ["A", "B"], correctIndex: 1 },
    { prompt: "Q3", options: ["A", "B"], correctIndex: 0 },
  ];

  const passResult = scoreQuiz(questions, [0, 1, 0], 70);
  assert.equal(passResult.scorePercent, 100);
  assert.equal(passResult.passed, true);

  const failResult = scoreQuiz(questions, [1, 1, 1], 70);
  assert.equal(failResult.scorePercent, 33);
  assert.equal(failResult.passed, false);
});

test("buildCertificateCode is deterministic per enrollment", () => {
  const first = buildCertificateCode("enrollment-123");
  const second = buildCertificateCode("enrollment-123");
  assert.equal(first, second);
  assert.match(first, /^CERT-[A-F0-9]{10}$/);
});
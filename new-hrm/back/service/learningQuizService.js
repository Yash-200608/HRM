const crypto = require("crypto");

const DEFAULT_PASS_PERCENT = 70;

function normalizeQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("At least one quiz question is required");
  }

  return questions.map((question, index) => {
    const prompt = String(question.prompt || "").trim();
    const options = Array.isArray(question.options)
      ? question.options.map((option) => String(option).trim()).filter(Boolean)
      : [];
    const correctIndex = Number(question.correctIndex);

    if (!prompt || options.length < 2) {
      throw new Error(`Question ${index + 1} must include a prompt and at least two options`);
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      throw new Error(`Question ${index + 1} has an invalid correctIndex`);
    }

    return { prompt, options, correctIndex };
  });
}

function scoreQuiz(questions, answers, passPercent = DEFAULT_PASS_PERCENT) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Quiz has no questions");
  }

  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw new Error("Answer count must match question count");
  }

  let correctCount = 0;
  questions.forEach((question, index) => {
    if (Number(answers[index]) === question.correctIndex) {
      correctCount += 1;
    }
  });

  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= passPercent;

  return {
    correctCount,
    totalQuestions: questions.length,
    scorePercent,
    passed,
    passPercent,
  };
}

function buildCertificateCode(enrollmentId) {
  const suffix = crypto.createHash("sha256").update(String(enrollmentId)).digest("hex").slice(0, 10);
  return `CERT-${suffix.toUpperCase()}`;
}

module.exports = {
  DEFAULT_PASS_PERCENT,
  buildCertificateCode,
  normalizeQuestions,
  scoreQuiz,
};
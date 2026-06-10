const { clearRateLimitBucketsForTests, createRateLimiter } = require("../../middleware/rateLimit.js");

let aiQueryLimiterInstance = null;

function buildAiQueryLimiter() {
  return createRateLimiter({
    windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.AI_RATE_LIMIT_MAX || 30),
    message: "AI rate limit exceeded. Please try again later.",
    prefix: "ai-query",
    keyFn: (req) => {
      const companyId = req.user?.companyId || "unknown-org";
      const userId = req.user?.id || req.ip || "unknown-user";
      return `${companyId}:${userId}`;
    },
  });
}

function getAiQueryLimiter() {
  if (!aiQueryLimiterInstance) {
    aiQueryLimiterInstance = buildAiQueryLimiter();
  }
  return aiQueryLimiterInstance;
}

function resetAiRateLimiterForTests() {
  aiQueryLimiterInstance = null;
  clearRateLimitBucketsForTests();
}

module.exports = {
  getAiQueryLimiter,
  resetAiRateLimiterForTests,
};
function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveRiskLevel(score) {
  if (score >= 80) {
    return "critical";
  }
  if (score >= 60) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

function buildLookbackRange(days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate, days };
}

function mean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function percentChange(current, previous) {
  if (!previous) {
    return current ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

module.exports = {
  buildLookbackRange,
  clampScore,
  mean,
  percentChange,
  resolveRiskLevel,
  standardDeviation,
};
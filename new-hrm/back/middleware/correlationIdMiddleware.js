const crypto = require("crypto");

const CORRELATION_HEADER = "x-correlation-id";

function normalizeCorrelationId(value) {
  if (!value) {
    return null;
  }

  const candidate = Array.isArray(value) ? value[0] : String(value);
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 128) : null;
}

function correlationIdMiddleware(req, res, next) {
  const incoming =
    normalizeCorrelationId(req.headers[CORRELATION_HEADER]) ||
    normalizeCorrelationId(req.headers["X-Correlation-Id"]);

  const correlationId = incoming || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);
  next();
}

module.exports = {
  CORRELATION_HEADER,
  correlationIdMiddleware,
  normalizeCorrelationId,
};
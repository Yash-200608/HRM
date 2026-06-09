const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  correlationIdMiddleware,
  normalizeCorrelationId,
} = require("../middleware/correlationIdMiddleware.js");

test("normalizeCorrelationId trims and bounds correlation values", () => {
  assert.equal(normalizeCorrelationId("  abc-123  "), "abc-123");
  assert.equal(normalizeCorrelationId(""), null);
  assert.equal(normalizeCorrelationId(undefined), null);
});

test("correlationIdMiddleware preserves incoming correlation id", () => {
  const req = { headers: { "x-correlation-id": "incoming-corr" } };
  const headers = {};
  const res = {
    setHeader(key, value) {
      headers[key] = value;
    },
  };

  let nextCalled = false;
  correlationIdMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.correlationId, "incoming-corr");
  assert.equal(headers["x-correlation-id"], "incoming-corr");
});

test("correlationIdMiddleware generates correlation id when missing", () => {
  const req = { headers: {} };
  const headers = {};
  const res = {
    setHeader(key, value) {
      headers[key] = value;
    },
  };

  correlationIdMiddleware(req, res, () => {});

  assert.ok(req.correlationId);
  assert.equal(headers["x-correlation-id"], req.correlationId);
});
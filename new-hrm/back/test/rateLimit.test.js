const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  createRateLimiter,
  clearRateLimitBucketsForTests,
} = require("../middleware/rateLimit.js");

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("createRateLimiter blocks requests after max is exceeded", async () => {
  clearRateLimitBucketsForTests();

  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 2,
    keyFn: () => "test-key",
  });

  const req = { ip: "127.0.0.1" };
  const next = () => {};

  await limiter(req, createMockRes(), next);
  await limiter(req, createMockRes(), next);

  const blockedRes = createMockRes();
  let nextCalled = false;
  await limiter(req, blockedRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.body.message, "Too many requests, please try again later");
});
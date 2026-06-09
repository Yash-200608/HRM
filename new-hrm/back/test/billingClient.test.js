const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { buildIdempotencyKey, callSubscription } = require("../service/billingClient.js");

let originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.INTERNAL_API_KEY;
});

test("buildIdempotencyKey is stable for the same payload", () => {
  const payload = { organizationId: "org-1", planCode: "growth" };
  const first = buildIdempotencyKey("org-1", "subscription-create", payload);
  const second = buildIdempotencyKey("org-1", "subscription-create", payload);

  assert.equal(first, second);
  assert.match(first, /^org-1:subscription-create:[a-f0-9]{16}$/);
});

test("callSubscription injects internal API key for server-side calls", async () => {
  process.env.INTERNAL_API_KEY = "server-only-key";

  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ allowed: true }), { status: 200 });
  };

  const response = await callSubscription("/v1/limits/employees/check", {
    method: "POST",
    body: {
      organizationId: "org-1",
      requestedEmployees: 10,
    },
    organizationId: "org-1",
    operation: "employee-limit-check",
    idempotent: true,
    baseUrl: "http://billing.example.test",
    timeoutMs: 1000,
  });

  assert.equal(response.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://billing.example.test/v1/limits/employees/check");
  assert.equal(calls[0].init.headers["x-internal-api-key"], "server-only-key");
  assert.match(calls[0].init.headers["idempotency-key"], /^org-1:employee-limit-check:[a-f0-9]{16}$/);
});
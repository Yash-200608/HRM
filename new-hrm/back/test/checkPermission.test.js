const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const express = require("express");
const checkPermission = require("../middleware/checkPermission.js");
const { clearEntitlementCacheForTests } = require("../middleware/entitlementMiddleware.js");

let originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  clearEntitlementCacheForTests();
  delete process.env.INTERNAL_API_KEY;
  delete process.env.ENTITLEMENT_FAIL_CLOSED;
});

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("checkPermission enforces module entitlements for admin users", async () => {
  clearEntitlementCacheForTests();
  process.env.INTERNAL_API_KEY = "server-only-key";
  process.env.ENTITLEMENT_FAIL_CLOSED = "true";

  const calls = [];
  global.fetch = async (url, init) => {
    if (String(url).includes("/v1/features/check")) {
      calls.push({ url, init });
      return new Response(JSON.stringify({ allowed: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return originalFetch(url, init);
  };

  const app = express();
  app.get(
    "/api/payroll",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: "org-1" };
      next();
    },
    checkPermission("payroll", "view"),
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await originalFetch(`http://127.0.0.1:${port}/api/payroll`);
    const body = await response.json();

    assert.equal(calls.length, 1);
    assert.equal(response.status, 403);
    assert.equal(body.code, "FEATURE_NOT_ENABLED");
    assert.equal(body.feature, "payroll");
  } finally {
    await close(server);
  }
});
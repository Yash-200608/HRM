const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const express = require("express");
const { requireAiAssistant } = require("../ai/services/aiEntitlementGuard.js");
const { clearEntitlementCacheForTests } = require("../middleware/entitlementMiddleware.js");

let originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  clearEntitlementCacheForTests();
  delete process.env.INTERNAL_API_KEY;
  delete process.env.ENTITLEMENT_FAIL_CLOSED;
  delete process.env.NODE_ENV;
  delete process.env.AI_ENABLED;
  delete process.env.AI_ASSISTANT_OPEN_ACCESS;
});

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("requireAiAssistant allows access in development when AI is enabled", async () => {
  process.env.NODE_ENV = "development";
  process.env.AI_ENABLED = "true";
  process.env.INTERNAL_API_KEY = "server-only-key";
  process.env.ENTITLEMENT_FAIL_CLOSED = "true";

  global.fetch = async (url) => {
    if (String(url).includes("/v1/features/check")) {
      return new Response(JSON.stringify({ allowed: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return originalFetch(url);
  };

  const app = express();
  app.get(
    "/api/ai/health",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: "org-1" };
      next();
    },
    requireAiAssistant(),
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
  } finally {
    await close(server);
  }
});

test("requireAiAssistant blocks when aiAssistant entitlement is denied", async () => {
  clearEntitlementCacheForTests();
  process.env.NODE_ENV = "production";
  process.env.AI_ASSISTANT_OPEN_ACCESS = "false";
  process.env.INTERNAL_API_KEY = "server-only-key";
  process.env.ENTITLEMENT_FAIL_CLOSED = "true";

  global.fetch = async (url) => {
    if (String(url).includes("/v1/features/check")) {
      return new Response(JSON.stringify({ allowed: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return originalFetch(url);
  };

  const app = express();
  app.get(
    "/api/ai/health",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: "org-1" };
      next();
    },
    requireAiAssistant(),
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/health`);
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.code, "FEATURE_NOT_ENABLED");
    assert.equal(body.feature, "aiAssistant");
  } finally {
    await close(server);
  }
});
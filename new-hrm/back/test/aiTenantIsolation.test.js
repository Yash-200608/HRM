const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");
const {
  aiTenantGuard,
  hasForbiddenTenantFields,
} = require("../ai/services/aiTenantGuard.js");

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("hasForbiddenTenantFields detects client-supplied tenant identifiers", () => {
  assert.equal(hasForbiddenTenantFields({ query: "hello" }), false);
  assert.equal(hasForbiddenTenantFields({ companyId: "org-2" }), true);
  assert.equal(hasForbiddenTenantFields({ organizationId: "org-2" }), true);
  assert.equal(hasForbiddenTenantFields({ userId: "user-2" }), true);
});

test("aiTenantGuard rejects body companyId for authenticated users", async () => {
  const app = express();
  app.use(express.json());
  app.post(
    "/api/ai/command-center/query",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: "org-1" };
      next();
    },
    aiTenantGuard,
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/command-center/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "test", companyId: "org-evil" }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, "TENANT_CONTEXT_FORBIDDEN");
  } finally {
    await close(server);
  }
});

test("aiTenantGuard requires organization context for non-super-admin users", async () => {
  const app = express();
  app.use(express.json());
  app.post(
    "/api/ai/command-center/query",
    (req, _res, next) => {
      req.user = { id: "admin-1", role: "admin", companyId: null };
      next();
    },
    aiTenantGuard,
    (_req, res) => res.json({ ok: true })
  );

  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/ai/command-center/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.code, "ORGANIZATION_REQUIRED");
  } finally {
    await close(server);
  }
});
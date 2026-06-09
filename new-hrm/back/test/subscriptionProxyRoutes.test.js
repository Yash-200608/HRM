const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const express = require("express");
const {
  billingProxyMounts,
  copyRequestHeaders,
  createSubscriptionProxyRouter,
} = require("../routes/subscriptionProxyRoutes.js");

let originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function createTestApp(upstreamPrefix) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/subscriptions",
    createSubscriptionProxyRouter({
      upstreamPrefix,
      baseUrl: "http://billing.example.test",
      timeoutMs: 1000,
    })
  );

  return app;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("billing proxy mounts include Phase 1 monetization routes", () => {
  const mountPaths = billingProxyMounts.map((mount) => mount.mountPath);

  assert.ok(mountPaths.includes("/api/plans"));
  assert.ok(mountPaths.includes("/api/usage"));
  assert.ok(mountPaths.includes("/api/limits"));
  assert.ok(mountPaths.includes("/api/features"));
  assert.ok(mountPaths.includes("/api/events"));
});

test("copyRequestHeaders forwards correlation id when injected by middleware", async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.correlationId = "corr-proxy-1";
    next();
  });
  app.use(
    "/api/plans",
    createSubscriptionProxyRouter({
      upstreamPrefix: "/v1/plans",
      baseUrl: "http://billing.example.test",
      timeoutMs: 1000,
    })
  );

  const server = await listen(app);
  try {
    const { port } = server.address();
    await originalFetch(`http://127.0.0.1:${port}/api/plans`, { method: "GET" });
    assert.equal(calls[0].init.headers["x-correlation-id"], "corr-proxy-1");
  } finally {
    await close(server);
  }
});

test("copyRequestHeaders strips client-supplied internal API keys", () => {
  const headers = copyRequestHeaders({
    headers: {
      authorization: "Bearer hrm-token",
      "x-internal-api-key": "client-supplied-key",
      "idempotency-key": "sub-create-1",
    },
  });

  assert.equal(headers.authorization, "Bearer hrm-token");
  assert.equal(headers["idempotency-key"], "sub-create-1");
  assert.equal(headers["x-internal-api-key"], undefined);
});

test("subscription proxy forwards path, query, auth headers, idempotency header, and JSON body", async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ data: { proxied: true } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  const app = createTestApp("/v1/subscriptions");
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await originalFetch(`http://127.0.0.1:${port}/api/subscriptions?expand=plan`, {
      method: "POST",
      headers: {
        authorization: "Bearer hrm-token",
        "content-type": "application/json",
        "idempotency-key": "sub-create-1",
        "x-internal-api-key": "must-not-forward",
      },
      body: JSON.stringify({ organizationId: "org-1", planCode: "starter" }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { data: { proxied: true } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://billing.example.test/v1/subscriptions?expand=plan");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.authorization, "Bearer hrm-token");
    assert.equal(calls[0].init.headers["idempotency-key"], "sub-create-1");
    assert.equal(calls[0].init.headers["x-internal-api-key"], undefined);
    assert.equal(calls[0].init.body, JSON.stringify({ organizationId: "org-1", planCode: "starter" }));
  } finally {
    await close(server);
  }
});

test("subscription proxy returns a safe 502 response when billing service is unavailable", async () => {
  global.fetch = async () => {
    throw new Error("connection refused");
  };

  const app = createTestApp("/v1/subscriptions");
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await originalFetch(`http://127.0.0.1:${port}/api/subscriptions/sub_1`, {
      headers: { authorization: "Bearer hrm-token" },
    });

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: {
        code: "BILLING_UPSTREAM_UNAVAILABLE",
        message: "Billing service unavailable",
      },
    });
  } finally {
    await close(server);
  }
});
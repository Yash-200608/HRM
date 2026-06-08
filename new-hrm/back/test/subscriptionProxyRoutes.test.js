const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const express = require("express");
const { createSubscriptionProxyRouter } = require("../routes/subscriptionProxyRoutes.js");

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

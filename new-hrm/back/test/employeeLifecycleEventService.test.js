const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { emitEmployeeLifecycleEventHttp } = require("../service/employeeLifecycleEventService.js");

let originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.INTERNAL_API_KEY;
  delete process.env.EMPLOYEE_EVENT_HTTP_EMIT_ENABLED;
});

test("emitEmployeeLifecycleEventHttp posts lifecycle events to Subscription inbound API", async () => {
  process.env.INTERNAL_API_KEY = "server-only-key";

  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ data: { eventId: "evt-1" } }), { status: 201 });
  };

  const result = await emitEmployeeLifecycleEventHttp({
    eventId: "hrm.employee.emp-1.created",
    source: "hrm",
    topic: "EmployeeCreated",
    organizationId: "org-1",
    payload: {
      eventType: "EmployeeCreated",
      organizationId: "org-1",
    },
  });

  assert.equal(result.delivered, true);
  assert.equal(result.via, "http");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/events\/inbound$/);
  assert.equal(calls[0].init.headers["x-internal-api-key"], "server-only-key");

  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.eventId, "hrm.employee.emp-1.created");
  assert.equal(body.organizationId, "org-1");
});

test("emitEmployeeLifecycleEventHttp retries and falls back when HTTP delivery fails", async () => {
  process.env.INTERNAL_API_KEY = "server-only-key";

  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    throw new Error("connection refused");
  };

  const result = await emitEmployeeLifecycleEventHttp({
    eventId: "hrm.employee.emp-2.created",
    source: "hrm",
    topic: "EmployeeCreated",
    organizationId: "org-2",
    payload: { eventType: "EmployeeCreated" },
  });

  assert.equal(result.delivered, false);
  assert.equal(result.via, "db-fallback");
  assert.equal(attempts, 3);
});
const assert = require("node:assert/strict");
const { afterEach, before, test } = require("node:test");

let originalFetch = global.fetch;
let originalInternalKey = process.env.INTERNAL_API_KEY;
let originalTrialFlag = process.env.TRIAL_PROVISIONING_ENABLED;

before(() => {
  process.env.INTERNAL_API_KEY = "test-internal-key";
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env.TRIAL_PROVISIONING_ENABLED = originalTrialFlag;
});

test("provisionTrialSubscription creates trial via Subscription API", async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        data: {
          _id: "sub-1",
          publicId: "sub_public_1",
          status: "TRIAL",
          planCode: "starter",
        },
      }),
      { status: 201, headers: { "content-type": "application/json" } }
    );
  };

  const {
    provisionTrialSubscription,
    resolveTrialPlanCode,
  } = require("../service/trialProvisioningService.js");

  const result = await provisionTrialSubscription("org-123", {
    actorId: "super-1",
    actorRole: "super_admin",
    correlationId: "corr-1",
  });

  assert.equal(result.provisioned, true);
  assert.equal(result.planCode, resolveTrialPlanCode());
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/subscriptions$/);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["x-internal-api-key"], "test-internal-key");
  assert.equal(calls[0].init.headers["x-correlation-id"], "corr-1");
  assert.match(calls[0].init.headers["idempotency-key"], /^org-123:trial-create:[a-f0-9]{16}$/);
});

test("provisionTrialSubscription can be disabled via env flag", async () => {
  process.env.TRIAL_PROVISIONING_ENABLED = "false";
  global.fetch = async () => {
    throw new Error("fetch should not be called when disabled");
  };

  const { provisionTrialSubscription } = require("../service/trialProvisioningService.js");
  const result = await provisionTrialSubscription("org-456");

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "TRIAL_PROVISIONING_DISABLED");
});

test("provisionTrialSubscription treats existing subscription as skipped", async () => {
  global.fetch = async () =>
    new Response(JSON.stringify({ error: { code: "Conflict" } }), {
      status: 409,
      headers: { "content-type": "application/json" },
    });

  const { provisionTrialSubscription } = require("../service/trialProvisioningService.js");
  const result = await provisionTrialSubscription("org-789");

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "SUBSCRIPTION_ALREADY_EXISTS");
});
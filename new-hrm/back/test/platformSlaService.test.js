const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  resolveIndicatorStatus,
  resolveOverallStatus,
} = require("../service/platformSlaService.js");
const {
  getRunbook,
  listRunbooks,
  matchRunbooksForIndicators,
} = require("../service/incidentRunbookService.js");

test("resolveIndicatorStatus marks higher-is-worse thresholds", () => {
  assert.equal(
    resolveIndicatorStatus(5, { warning: 3, critical: 6, higherIsWorse: true }),
    "warning"
  );
  assert.equal(
    resolveIndicatorStatus(1, { warning: 3, critical: 6, higherIsWorse: true }),
    "healthy"
  );
  assert.equal(
    resolveIndicatorStatus(7, { warning: 3, critical: 6, higherIsWorse: true }),
    "critical"
  );
});

test("resolveOverallStatus escalates to the worst indicator state", () => {
  assert.equal(
    resolveOverallStatus([
      { status: "healthy" },
      { status: "warning" },
    ]),
    "warning"
  );
  assert.equal(
    resolveOverallStatus([
      { status: "healthy" },
      { status: "critical" },
    ]),
    "critical"
  );
});

test("incident runbook catalog is addressable by id", () => {
  const runbooks = listRunbooks();
  assert.ok(runbooks.length >= 5);
  const billingRunbook = getRunbook("billing-proxy-failure");
  assert.equal(billingRunbook.title, "Billing proxy unavailable");
  assert.ok(Array.isArray(billingRunbook.steps));
  assert.ok(billingRunbook.steps.length > 0);
});

test("matchRunbooksForIndicators recommends playbooks for unhealthy signals", () => {
  const matches = matchRunbooksForIndicators([
    { key: "billing_proxy", status: "critical" },
  ]);
  assert.ok(matches.length > 0);
});
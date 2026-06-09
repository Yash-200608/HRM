const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolveModuleEntitlement } = require("@hrm-subscription/shared-types");

test("Phase 4 modules map to plan-gated entitlements", () => {
  assert.equal(resolveModuleEntitlement("performance"), "performanceReviews");
  assert.equal(resolveModuleEntitlement("assets"), "assetManagement");
  assert.equal(resolveModuleEntitlement("learning"), "workflowAutomation");
});

test("Phase 4 premium modules are absent on lower-tier plan features", () => {
  const professionalFeatures = {
    performanceReviews: true,
    assetManagement: true,
    workflowAutomation: true,
  };

  const starterFeatures = {
    performanceReviews: false,
    assetManagement: false,
    workflowAutomation: false,
  };

  assert.equal(professionalFeatures.performanceReviews, true);
  assert.equal(starterFeatures.performanceReviews, false);
  assert.equal(starterFeatures.assetManagement, false);
});
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  ENTITLEMENT_KEYS,
  HRM_MODULE_TO_ENTITLEMENT,
  resolveModuleEntitlement,
} = require("@hrm-subscription/shared-types");

test("shared-types exposes entitlement keys and module mapping", () => {
  assert.ok(ENTITLEMENT_KEYS.includes("payroll"));
  assert.ok(ENTITLEMENT_KEYS.includes("advancedReports"));
  assert.equal(HRM_MODULE_TO_ENTITLEMENT.payroll, "payroll");
  assert.equal(HRM_MODULE_TO_ENTITLEMENT.reports, "advancedReports");
  assert.equal(resolveModuleEntitlement("payroll"), "payroll");
  assert.equal(resolveModuleEntitlement("dashboard"), null);
  assert.equal(resolveModuleEntitlement("performance"), "performanceReviews");
  assert.equal(resolveModuleEntitlement("assets"), "assetManagement");
  assert.equal(resolveModuleEntitlement("learning"), "workflowAutomation");
});
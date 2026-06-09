const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  isMutationMethod,
  resolveReadOnlyReason,
} = require("../service/tenantContextService.js");

test("employee create route uses mutation methods blocked for archived tenants", () => {
  assert.equal(isMutationMethod("POST"), true);

  const archivedReason = resolveReadOnlyReason("ARCHIVED", "ACTIVE");
  assert.equal(archivedReason.code, "TENANT_READ_ONLY");
  assert.equal(archivedReason.source, "company");
});

test("archived subscription status also blocks writes", () => {
  const reason = resolveReadOnlyReason("ACTIVE", "ARCHIVED");
  assert.equal(reason.code, "SUBSCRIPTION_READ_ONLY");
  assert.equal(reason.status, "ARCHIVED");
});
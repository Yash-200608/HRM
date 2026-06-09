const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  clearTenantContextCacheForTests,
  resolveReadOnlyReason,
  resolveOrganizationIdFromRequest,
  isMutationMethod,
} = require("../service/tenantContextService.js");

test("resolveReadOnlyReason flags archived company and subscription states", () => {
  assert.deepEqual(resolveReadOnlyReason("ARCHIVED", "ACTIVE"), {
    code: "TENANT_READ_ONLY",
    message: "Organization is in read-only mode",
    source: "company",
    status: "ARCHIVED",
  });

  assert.deepEqual(resolveReadOnlyReason("ACTIVE", "READ_ONLY"), {
    code: "SUBSCRIPTION_READ_ONLY",
    message: "Subscription is in read-only mode",
    source: "subscription",
    status: "READ_ONLY",
  });

  assert.equal(resolveReadOnlyReason("ACTIVE", "ACTIVE"), null);
});

test("resolveOrganizationIdFromRequest prefers authenticated tenant context", () => {
  const organizationId = resolveOrganizationIdFromRequest({
    user: { companyId: "org-from-token" },
    body: { companyId: "org-from-body" },
    query: {},
    params: {},
  });

  assert.equal(organizationId, "org-from-token");
});

test("isMutationMethod identifies write operations", () => {
  assert.equal(isMutationMethod("POST"), true);
  assert.equal(isMutationMethod("GET"), false);
  clearTenantContextCacheForTests();
});
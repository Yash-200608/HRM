const assert = require("node:assert/strict");
const { test } = require("node:test");
const jwt = require("jsonwebtoken");
const {
  JWT_CLAIMS_VERSION,
  buildJwtClaimsV1,
  isTokenVersionStale,
  toSubscriptionPrincipal,
  validateJwtClaims,
} = require("@hrm-subscription/shared-auth");

test("buildJwtClaimsV1 emits versioned claims with org and session metadata", () => {
  const claims = buildJwtClaimsV1({
    id: "user-1",
    role: "admin",
    companyId: "org-1",
    tokenVersion: 2,
    sessionId: "session-1",
    subscriptionPlan: "growth",
    entitlements: ["payroll"],
  });

  assert.equal(claims.ver, JWT_CLAIMS_VERSION);
  assert.equal(claims.iss, "hrm-platform");
  assert.equal(claims.aud, "hrm-platform");
  assert.equal(claims.id, "user-1");
  assert.equal(claims.orgId, "org-1");
  assert.equal(claims.principalKind, "admin");
  assert.equal(claims.tokenVersion, 2);
  assert.equal(claims.sessionId, "session-1");
  assert.deepEqual(claims.entitlements, ["payroll"]);
});

test("validateJwtClaims accepts legacy tokens without v1 metadata", () => {
  const result = validateJwtClaims({
    id: "legacy-user",
    role: "employee",
    companyId: "org-1",
  });

  assert.equal(result.valid, true);
  assert.equal(result.isLegacy, true);
  assert.equal(result.claims.principalKind, "employee");
});

test("toSubscriptionPrincipal maps admin and employee roles to Subscription kinds", () => {
  const adminPrincipal = toSubscriptionPrincipal(
    { id: "admin-1", role: "admin", companyId: "org-1" },
    buildJwtClaimsV1({ id: "admin-1", role: "admin", companyId: "org-1", sessionId: "s-1" })
  );

  assert.deepEqual(adminPrincipal, {
    kind: "admin",
    subject: "admin-1",
    organizationId: "org-1",
    roles: ["admin", "admin"],
    sessionId: "s-1",
    tokenVersion: 0,
    tokenId: "s-1",
  });

  const employeePrincipal = toSubscriptionPrincipal(
    { id: "emp-1", role: "employee", companyId: "org-1" },
    buildJwtClaimsV1({ id: "emp-1", role: "employee", companyId: "org-1", sessionId: "s-2", tokenVersion: 3 })
  );

  assert.equal(employeePrincipal.kind, "organization");
  assert.equal(employeePrincipal.organizationId, "org-1");
  assert.equal(employeePrincipal.tokenVersion, 3);
});

test("isTokenVersionStale detects revoked token generations", () => {
  assert.equal(isTokenVersionStale({ tokenVersion: 1 }, { tokenVersion: 2 }), true);
  assert.equal(isTokenVersionStale({ tokenVersion: 2 }, { tokenVersion: 2 }), false);
  assert.equal(isTokenVersionStale({}, { tokenVersion: 2 }), false);
});

test("signed v1 access tokens preserve claims through jwt verify", () => {
  const secret = "test-shared-auth-secret";
  const claims = buildJwtClaimsV1({
    id: "user-2",
    role: "manager",
    companyId: "org-9",
    tokenVersion: 1,
    sessionId: "session-9",
  });
  const token = jwt.sign(claims, secret);
  const decoded = jwt.verify(token, secret);
  const validated = validateJwtClaims(decoded);

  assert.equal(validated.valid, true);
  assert.equal(validated.isLegacy, false);
  assert.equal(validated.claims.principalKind, "manager");
});
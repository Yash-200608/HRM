const crypto = require("crypto");
const {
  ENTITLEMENT_KEYS,
  resolveModuleEntitlement,
} = require("@hrm-subscription/shared-types");

const JWT_CLAIMS_VERSION = "v1";
const DEFAULT_JWT_ISSUER = "hrm-platform";
const DEFAULT_JWT_AUDIENCE = "hrm-platform";

const PRINCIPAL_KINDS = Object.freeze([
  "admin",
  "employee",
  "hr",
  "manager",
  "super_admin",
]);

const SUBSCRIPTION_KIND_BY_PRINCIPAL = Object.freeze({
  super_admin: "admin",
  admin: "admin",
  employee: "organization",
  hr: "organization",
  manager: "organization",
});

function resolvePrincipalKind(role) {
  const normalized = String(role || "").trim().toLowerCase();

  if (normalized === "super_admin") {
    return "super_admin";
  }

  if (normalized === "admin") {
    return "admin";
  }

  if (normalized === "hr" || normalized === "manager") {
    return normalized;
  }

  return "employee";
}

function resolveSubscriptionKind(principalKind) {
  return SUBSCRIPTION_KIND_BY_PRINCIPAL[principalKind] || "organization";
}

function normalizeOrganizationId(...values) {
  for (const value of values) {
    if (value == null) {
      continue;
    }

    if (typeof value === "object" && value._id) {
      return String(value._id);
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function buildSubscriptionRoles(principalKind, role) {
  const normalizedRole = String(role || principalKind).trim().toLowerCase();

  if (principalKind === "super_admin") {
    return ["admin", "super_admin"];
  }

  if (principalKind === "admin") {
    return ["admin", normalizedRole];
  }

  return [principalKind, normalizedRole].filter((item, index, items) => items.indexOf(item) === index);
}

function extractEntitlementsFromSnapshot(featureSnapshot) {
  if (!featureSnapshot || typeof featureSnapshot !== "object") {
    return [];
  }

  return ENTITLEMENT_KEYS.filter((key) => Boolean(featureSnapshot[key]));
}

function resolveJwtIssuer(value) {
  const configured = value || process.env.JWT_ISSUER || DEFAULT_JWT_ISSUER;
  return String(configured).trim() || DEFAULT_JWT_ISSUER;
}

function resolveJwtAudience(value) {
  const configured = value || process.env.JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE;
  return String(configured).trim() || DEFAULT_JWT_AUDIENCE;
}

function buildJwtClaimsV1(input = {}) {
  const principalKind = resolvePrincipalKind(input.principalKind || input.role);
  const organizationId = normalizeOrganizationId(input.orgId, input.companyId, input.organizationId);

  return {
    ver: JWT_CLAIMS_VERSION,
    iss: resolveJwtIssuer(input.iss),
    aud: resolveJwtAudience(input.aud),
    id: String(input.id),
    role: String(input.role),
    companyId: organizationId,
    orgId: organizationId,
    principalKind,
    tokenVersion: Number(input.tokenVersion) || 0,
    sessionId: input.sessionId || crypto.randomUUID(),
    entitlements: Array.isArray(input.entitlements) ? input.entitlements : [],
    subscriptionPlan: input.subscriptionPlan || null,
    permissions: input.permissions || null,
  };
}

function validateJwtClaims(decoded) {
  if (!decoded || typeof decoded !== "object") {
    return {
      valid: false,
      isLegacy: false,
      claims: null,
      errors: ["Invalid token payload"],
    };
  }

  if (!decoded.id || !decoded.role) {
    return {
      valid: false,
      isLegacy: false,
      claims: null,
      errors: ["Missing id or role"],
    };
  }

  const isLegacy = decoded.ver !== JWT_CLAIMS_VERSION;
  const organizationId = normalizeOrganizationId(decoded.orgId, decoded.companyId);
  const claims = {
    ver: decoded.ver || null,
    iss: decoded.iss ? String(decoded.iss) : null,
    aud: decoded.aud ? String(decoded.aud) : null,
    id: String(decoded.id),
    role: String(decoded.role),
    companyId: organizationId,
    orgId: organizationId,
    principalKind: decoded.principalKind
      ? String(decoded.principalKind)
      : resolvePrincipalKind(decoded.role),
    tokenVersion: decoded.tokenVersion ?? 0,
    sessionId: decoded.sessionId ? String(decoded.sessionId) : null,
    entitlements: Array.isArray(decoded.entitlements) ? decoded.entitlements : [],
    subscriptionPlan: decoded.subscriptionPlan ? String(decoded.subscriptionPlan) : null,
    permissions: decoded.permissions && typeof decoded.permissions === "object" ? decoded.permissions : null,
  };

  if (!isLegacy) {
    const errors = [];
    const expectedIssuer = resolveJwtIssuer();
    const expectedAudience = resolveJwtAudience();

    if (!claims.sessionId) {
      errors.push("Missing sessionId");
    }

    if (!PRINCIPAL_KINDS.includes(claims.principalKind)) {
      errors.push("Invalid principalKind");
    }

    if (!claims.iss || claims.iss !== expectedIssuer) {
      errors.push("Invalid issuer");
    }

    const audience = claims.aud;
    if (!audience || audience !== expectedAudience) {
      errors.push("Invalid audience");
    }

    if (errors.length > 0) {
      return {
        valid: false,
        isLegacy: false,
        claims,
        errors,
      };
    }
  }

  return {
    valid: true,
    isLegacy,
    claims,
    errors: [],
  };
}

function toSubscriptionPrincipal(hrmUser = {}, decoded = {}) {
  const subject = String(hrmUser.id || decoded.id || "").trim();
  const role = hrmUser.role || decoded.role;
  const principalKind = resolvePrincipalKind(decoded.principalKind || role);
  const organizationId = normalizeOrganizationId(
    hrmUser.companyId,
    decoded.orgId,
    decoded.companyId
  );

  if (!subject) {
    return null;
  }

  const kind = resolveSubscriptionKind(principalKind);

  if (kind === "organization" && !organizationId) {
    return null;
  }

  return {
    kind,
    subject,
    organizationId: organizationId || undefined,
    roles: buildSubscriptionRoles(principalKind, role),
    sessionId: decoded.sessionId ? String(decoded.sessionId) : undefined,
    tokenVersion:
      decoded.tokenVersion == null ? undefined : Number(decoded.tokenVersion),
    tokenId: decoded.sessionId ? String(decoded.sessionId) : undefined,
  };
}

function isTokenVersionStale(decoded, user) {
  if (decoded?.tokenVersion == null || user?.tokenVersion == null) {
    return false;
  }

  return Number(decoded.tokenVersion) !== Number(user.tokenVersion);
}

function mapModuleToEntitlement(moduleName) {
  return resolveModuleEntitlement(moduleName);
}

module.exports = {
  DEFAULT_JWT_AUDIENCE,
  DEFAULT_JWT_ISSUER,
  JWT_CLAIMS_VERSION,
  PRINCIPAL_KINDS,
  resolveJwtAudience,
  resolveJwtIssuer,
  buildJwtClaimsV1,
  buildSubscriptionRoles,
  extractEntitlementsFromSnapshot,
  isTokenVersionStale,
  mapModuleToEntitlement,
  resolvePrincipalKind,
  resolveSubscriptionKind,
  toSubscriptionPrincipal,
  validateJwtClaims,
};
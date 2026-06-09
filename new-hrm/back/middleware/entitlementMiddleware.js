const { resolveModuleEntitlement, isEntitlementKey } = require("@hrm-subscription/shared-types");
const { callSubscription } = require("../service/billingClient.js");
const { recordAuditEvent } = require("../service/auditService.js");

const CACHE_TTL_MS = 60_000;
const entitlementCache = new Map();

function isFailClosed() {
  if (process.env.ENTITLEMENT_FAIL_CLOSED != null) {
    return process.env.ENTITLEMENT_FAIL_CLOSED === "true";
  }

  return process.env.NODE_ENV === "production";
}

function buildCacheKey(organizationId, featureKey) {
  return `${organizationId}:${featureKey}`;
}

function readCachedEntitlement(organizationId, featureKey) {
  const cacheKey = buildCacheKey(organizationId, featureKey);
  const cached = entitlementCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    entitlementCache.delete(cacheKey);
    return null;
  }

  return cached.allowed;
}

function writeCachedEntitlement(organizationId, featureKey, allowed) {
  entitlementCache.set(buildCacheKey(organizationId, featureKey), {
    allowed,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function checkEntitlement(organizationId, featureKey) {
  const cached = readCachedEntitlement(organizationId, featureKey);
  if (cached != null) {
    return { allowed: cached, fromCache: true };
  }

  const response = await callSubscription("/v1/features/check", {
    method: "POST",
    body: {
      organizationId: String(organizationId),
      feature: featureKey,
    },
    organizationId: String(organizationId),
    operation: `feature-check:${featureKey}`,
    idempotent: true,
  });

  if (!response.ok) {
    return {
      allowed: !isFailClosed(),
      fromCache: false,
      upstreamStatus: response.status,
    };
  }

  const allowed = Boolean(response.data?.allowed);
  writeCachedEntitlement(organizationId, featureKey, allowed);

  return { allowed, fromCache: false };
}

function requireEntitlement(featureKey) {
  if (!isEntitlementKey(featureKey)) {
    throw new Error(`Unknown entitlement key: ${featureKey}`);
  }

  return async function entitlementGuard(req, res, next) {
    try {
      const organizationId = req.user?.companyId;

      if (!organizationId) {
        return res.status(403).json({
          code: "ORGANIZATION_REQUIRED",
          message: "Organization context is required",
        });
      }

      const result = await checkEntitlement(organizationId, featureKey);

      if (!result.allowed) {
        await recordAuditEvent({
          actorId: req.user?.id,
          actorRole: req.user?.role,
          companyId: organizationId,
          action: "ENTITLEMENT_DENIED",
          resourceType: "feature",
          resourceId: featureKey,
          metadata: {
            path: req.originalUrl,
            method: req.method,
            upstreamStatus: result.upstreamStatus ?? null,
          },
        });

        return res.status(403).json({
          code: "FEATURE_NOT_ENABLED",
          message: "This feature is not included in your current plan",
          feature: featureKey,
        });
      }

      next();
    } catch (error) {
      if (isFailClosed()) {
        return res.status(503).json({
          code: "ENTITLEMENT_CHECK_UNAVAILABLE",
          message: "Unable to verify plan entitlements",
        });
      }

      next();
    }
  };
}

function requireModuleEntitlement(moduleName) {
  const featureKey = resolveModuleEntitlement(moduleName);

  if (!featureKey) {
    return (_req, _res, next) => next();
  }

  return requireEntitlement(featureKey);
}

function clearEntitlementCacheForTests() {
  entitlementCache.clear();
}

module.exports = {
  checkEntitlement,
  clearEntitlementCacheForTests,
  requireEntitlement,
  requireModuleEntitlement,
};
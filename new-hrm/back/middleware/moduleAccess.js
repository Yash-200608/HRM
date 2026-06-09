const { resolveModuleEntitlement } = require("@hrm-subscription/shared-types");
const { checkEntitlement } = require("./entitlementMiddleware.js");
const { recordAuditEvent } = require("../service/auditService.js");
const { resolveOrganizationIdFromRequest } = require("../service/tenantContextService.js");

function enforceModuleAccess(moduleName) {
  const featureKey = resolveModuleEntitlement(moduleName);

  return async function moduleAccessGuard(req, res, next) {
    if (!featureKey) {
      return next();
    }

    try {
      const organizationId = resolveOrganizationIdFromRequest(req);

      if (!organizationId) {
        return next();
      }

      const result = await checkEntitlement(organizationId, featureKey);

      if (!result.allowed) {
        await recordAuditEvent({
          actorId: req.user?.id || null,
          actorRole: req.user?.role || null,
          companyId: String(organizationId),
          action: "ENTITLEMENT_DENIED",
          resourceType: "feature",
          resourceId: featureKey,
          metadata: {
            module: moduleName,
            path: req.originalUrl,
            method: req.method,
            upstreamStatus: result.upstreamStatus ?? null,
          },
        });

        return res.status(403).json({
          code: "FEATURE_NOT_ENABLED",
          message: "This feature is not included in your current plan",
          feature: featureKey,
          module: moduleName,
        });
      }

      next();
    } catch (error) {
      return next();
    }
  };
}

module.exports = {
  enforceModuleAccess,
};
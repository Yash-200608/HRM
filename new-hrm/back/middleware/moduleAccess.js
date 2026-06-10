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
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const organizationId = resolveOrganizationIdFromRequest(req);

      if (!organizationId) {
        if (req.user.role === "super_admin") {
          return next();
        }

        return res.status(403).json({
          code: "TENANT_REQUIRED",
          message: "Organization context is required",
        });
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
      console.error("moduleAccess error:", error);
      return res.status(503).json({
        code: "ENTITLEMENT_CHECK_FAILED",
        message: "Unable to verify feature access",
      });
    }
  };
}

module.exports = {
  enforceModuleAccess,
};
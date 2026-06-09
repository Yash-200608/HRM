const { recordAuditEvent } = require("../service/auditService.js");
const {
  isMutationMethod,
  resolveOrganizationIdFromRequest,
  resolveTenantContext,
} = require("../service/tenantContextService.js");

function shouldBypassWritableCheck(user) {
  return user?.role === "super_admin";
}

async function denyReadOnlyTenant(req, res, tenantContext) {
  await recordAuditEvent({
    actorId: req.user?.id || null,
    actorRole: req.user?.role || null,
    companyId: tenantContext.organizationId,
    action: "TENANT_READ_ONLY_DENIED",
    resourceType: "organization",
    resourceId: tenantContext.organizationId,
    metadata: {
      path: req.originalUrl,
      method: req.method,
      reason: tenantContext.readOnlyReason,
    },
  });

  return res.status(403).json({
    code: tenantContext.readOnlyReason?.code || "TENANT_READ_ONLY",
    message: tenantContext.readOnlyReason?.message || "Organization is in read-only mode",
    organizationId: tenantContext.organizationId,
    companyStatus: tenantContext.companyStatus,
    subscriptionStatus: tenantContext.subscriptionStatus,
  });
}

function requireWritableTenant(options = {}) {
  return async function writableTenantGuard(req, res, next) {
    try {
      if (!isMutationMethod(req.method) && !options.checkReads) {
        return next();
      }

      if (shouldBypassWritableCheck(req.user)) {
        return next();
      }

      const organizationId = options.resolveOrganizationId
        ? options.resolveOrganizationId(req)
        : resolveOrganizationIdFromRequest(req);

      if (!organizationId) {
        return next();
      }

      const tenantContext = await resolveTenantContext(organizationId);
      req.tenantContext = tenantContext;

      if (!tenantContext.writable) {
        return denyReadOnlyTenant(req, res, tenantContext);
      }

      next();
    } catch (error) {
      return res.status(500).json({
        code: "TENANT_CONTEXT_UNAVAILABLE",
        message: "Unable to verify tenant write access",
      });
    }
  };
}

module.exports = {
  denyReadOnlyTenant,
  requireWritableTenant,
  shouldBypassWritableCheck,
};
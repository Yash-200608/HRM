const FORBIDDEN_TENANT_FIELDS = ["companyId", "organizationId", "orgId", "userId"];

function hasForbiddenTenantFields(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return FORBIDDEN_TENANT_FIELDS.some((field) => payload[field] != null);
}

function aiTenantGuard(req, res, next) {
  if (hasForbiddenTenantFields(req.body)) {
    return res.status(400).json({
      code: "TENANT_CONTEXT_FORBIDDEN",
      message: "Tenant and user context must not be supplied by the client",
    });
  }

  if (!req.user?.companyId && req.user?.role !== "super_admin") {
    return res.status(403).json({
      code: "ORGANIZATION_REQUIRED",
      message: "Organization context is required for AI requests",
    });
  }

  return next();
}

module.exports = {
  FORBIDDEN_TENANT_FIELDS,
  aiTenantGuard,
  hasForbiddenTenantFields,
};
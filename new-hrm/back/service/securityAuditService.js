const { recordAuditEvent } = require("./auditService.js");

function buildAuthContext(req, overrides = {}) {
  return {
    actorId: overrides.actorId ?? req?.user?.id ?? null,
    actorRole: overrides.actorRole ?? req?.user?.role ?? null,
    companyId: overrides.companyId ?? req?.user?.companyId ?? null,
    correlationId: overrides.correlationId ?? req?.correlationId ?? null,
    ipAddress: overrides.ipAddress ?? req?.ip ?? null,
    userAgent: overrides.userAgent ?? req?.headers?.["user-agent"] ?? null,
  };
}

async function recordSecurityAudit(action, req, details = {}) {
  const context = buildAuthContext(req, details);
  return recordAuditEvent({
    actorId: context.actorId,
    actorRole: context.actorRole,
    companyId: context.companyId ? String(context.companyId) : null,
    action,
    resourceType: details.resourceType ?? null,
    resourceId: details.resourceId != null ? String(details.resourceId) : null,
    metadata: {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      ...(details.metadata || {}),
    },
    correlationId: context.correlationId,
  });
}

async function recordLoginSuccess(req, user, details = {}) {
  return recordSecurityAudit("auth.login.success", req, {
    actorId: user?.id || user?._id?.toString() || null,
    actorRole: user?.role || null,
    companyId: user?.companyId?._id || user?.companyId || null,
    resourceType: "session",
    resourceId: details.sessionId || null,
    metadata: {
      accountType: details.accountType || null,
      mfaUsed: Boolean(details.mfaUsed),
    },
  });
}

async function recordLoginFailure(req, details = {}) {
  return recordSecurityAudit("auth.login.failure", req, {
    actorId: null,
    actorRole: details.accountType || null,
    metadata: {
      email: details.email || null,
      reason: details.reason || "invalid_credentials",
      accountType: details.accountType || null,
    },
  });
}

module.exports = {
  buildAuthContext,
  recordSecurityAudit,
  recordLoginSuccess,
  recordLoginFailure,
};
const { evaluateQueryAgainstPolicy, getOrganizationAiPolicy } = require("./aiPolicyEngine.js");
const { logAiQueryDenied } = require("./aiAuditLogger.js");
const { resolveAiScope } = require("./aiPermissionScopeService.js");

function aiPolicyGuard() {
  return async function policyGuard(req, res, next) {
    try {
      if (!req.user?.companyId) {
        if (req.user?.role === "super_admin") {
          return next();
        }
        return res.status(403).json({
          code: "ORGANIZATION_REQUIRED",
          message: "Organization context is required",
        });
      }

      const [policy, scope] = await Promise.all([
        getOrganizationAiPolicy(req.user.companyId),
        resolveAiScope(req),
      ]);

      req.aiPolicy = policy;
      req.aiScope = scope;

      const evaluation = evaluateQueryAgainstPolicy({ policy, scope });
      if (!evaluation.allowed) {
        await logAiQueryDenied(req, { reason: evaluation.reason });
        return res.status(403).json({
          code: "AI_POLICY_DENIED",
          message: evaluation.reason,
          scope,
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        code: "AI_POLICY_CHECK_FAILED",
        message: "Unable to evaluate AI policy",
      });
    }
  };
}

module.exports = {
  aiPolicyGuard,
};
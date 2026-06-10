const {
  getOrganizationAiPolicy,
  upsertOrganizationAiPolicy,
} = require("../services/aiPolicyEngine.js");
const { recordAuditEvent } = require("../../service/auditService.js");

async function getPolicyHandler(req, res) {
  try {
    const organizationId = req.user?.companyId;
    if (!organizationId) {
      return res.status(403).json({
        code: "ORGANIZATION_REQUIRED",
        message: "Organization context is required",
      });
    }

    const policy = await getOrganizationAiPolicy(organizationId);
    return res.json({ policy });
  } catch (error) {
    return res.status(500).json({
      code: "AI_POLICY_FETCH_FAILED",
      message: error.message || "Failed to load AI policy",
    });
  }
}

async function updatePolicyHandler(req, res) {
  try {
    const organizationId = req.user?.companyId;
    if (!organizationId) {
      return res.status(403).json({
        code: "ORGANIZATION_REQUIRED",
        message: "Organization context is required",
      });
    }

    const payload = req.body?.policy || req.body || {};
    const policy = await upsertOrganizationAiPolicy(
      organizationId,
      payload,
      req.user?.id || null
    );

    await recordAuditEvent({
      actorId: req.user?.id ?? null,
      actorRole: req.user?.role ?? null,
      companyId: organizationId,
      action: "AI_POLICY_UPDATED",
      resourceType: "ai_policy",
      resourceId: organizationId,
      metadata: {
        enabled: policy.enabled,
        blockedToolsCount: (policy.blockedTools || []).length,
      },
    }).catch(() => {});

    return res.json({ policy });
  } catch (error) {
    return res.status(500).json({
      code: "AI_POLICY_UPDATE_FAILED",
      message: error.message || "Failed to update AI policy",
    });
  }
}

module.exports = {
  getPolicyHandler,
  updatePolicyHandler,
};
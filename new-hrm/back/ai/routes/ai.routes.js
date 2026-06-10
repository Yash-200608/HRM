const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware.js");
const {
  healthHandler,
  queryHandler,
  suggestionsHandler,
} = require("../controllers/aiCommandCenterController.js");
const {
  cancelDraftHandler,
  confirmDraftHandler,
  getDraftHandler,
} = require("../controllers/aiActionController.js");
const { requireWritableTenant } = require("../../middleware/requireWritableTenant.js");
const { requireAiAssistant } = require("../services/aiEntitlementGuard.js");
const { aiPermissionGuard } = require("../services/aiPermissionGuard.js");
const { getAiQueryLimiter } = require("../services/aiRateLimiter.js");
const { aiTenantGuard } = require("../services/aiTenantGuard.js");
const { aiPolicyGuard } = require("../services/aiPolicyGuard.js");
const { aiAdminGuard } = require("../services/aiAdminGuard.js");
const { isAiEnabled } = require("../providers/providerFactory.js");
const {
  getPolicyHandler,
  updatePolicyHandler,
} = require("../controllers/aiPolicyController.js");
const {
  deleteConversationHandler,
  getConversationHandler,
  listConversationsHandler,
} = require("../controllers/aiConversationController.js");
const { analyticsHandler } = require("../controllers/aiAdminController.js");

const router = express.Router();

function aiFeatureGate(req, res, next) {
  if (!isAiEnabled()) {
    return res.status(503).json({
      code: "AI_DISABLED",
      message: "AI features are currently disabled",
    });
  }
  return next();
}

const commandCenterGuards = [
  authMiddleware,
  aiFeatureGate,
  getAiQueryLimiter(),
  requireAiAssistant,
  aiTenantGuard,
  aiPolicyGuard(),
  aiPermissionGuard("commandCenter"),
];

const aiReadGuards = [
  authMiddleware,
  aiFeatureGate,
  requireAiAssistant,
  aiTenantGuard,
  aiPolicyGuard(),
  aiPermissionGuard("commandCenter"),
];

const aiAdminGuards = [
  authMiddleware,
  aiFeatureGate,
  requireAiAssistant,
  aiTenantGuard,
  aiPolicyGuard(),
  aiPermissionGuard("commandCenter"),
  aiAdminGuard(),
];

router.post("/command-center/query", ...commandCenterGuards, queryHandler);
router.get("/command-center/suggestions", ...commandCenterGuards, suggestionsHandler);
router.get("/health", authMiddleware, aiPermissionGuard("commandCenter"), healthHandler);

const actionMutationGuards = [
  authMiddleware,
  aiFeatureGate,
  requireAiAssistant,
  aiTenantGuard,
  aiPolicyGuard(),
  aiPermissionGuard("commandCenter"),
  requireWritableTenant(),
];

router.get("/actions/:draftId", ...actionMutationGuards, getDraftHandler);
router.post("/actions/:draftId/confirm", ...actionMutationGuards, confirmDraftHandler);
router.post("/actions/:draftId/cancel", ...actionMutationGuards, cancelDraftHandler);

router.get("/conversations", ...aiReadGuards, listConversationsHandler);
router.get("/conversations/:conversationId", ...aiReadGuards, getConversationHandler);
router.delete("/conversations/:conversationId", ...aiReadGuards, deleteConversationHandler);

router.get("/policy", ...aiAdminGuards, getPolicyHandler);
router.put("/policy", ...aiAdminGuards, requireWritableTenant(), updatePolicyHandler);

router.get("/admin/analytics", ...aiAdminGuards, analyticsHandler);

module.exports = router;
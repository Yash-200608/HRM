const { requireEntitlement } = require("../../middleware/entitlementMiddleware.js");
const { isAiEnabled } = require("../providers/providerFactory.js");

function isAiAssistantOpenAccess() {
  if (process.env.AI_ASSISTANT_OPEN_ACCESS === "true") {
    return true;
  }

  if (process.env.AI_ASSISTANT_OPEN_ACCESS === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production" && isAiEnabled();
}

function requireAiAssistant() {
  const entitlementGuard = requireEntitlement("aiAssistant");

  return async function aiAssistantGuard(req, res, next) {
    if (isAiAssistantOpenAccess()) {
      return next();
    }

    return entitlementGuard(req, res, next);
  };
}

module.exports = {
  isAiAssistantOpenAccess,
  requireAiAssistant,
};
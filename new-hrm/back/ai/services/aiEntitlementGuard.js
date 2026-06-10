const { requireEntitlement } = require("../../middleware/entitlementMiddleware.js");

const requireAiAssistant = requireEntitlement("aiAssistant");

module.exports = {
  requireAiAssistant,
};
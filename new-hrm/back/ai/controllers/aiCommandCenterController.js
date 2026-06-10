const { getAiProvider, isAiEnabled, resolveProviderName } = require("../providers/providerFactory.js");
const { runCommandCenterQuery } = require("../services/aiOrchestratorService.js");
const { filterSuggestionsForUser } = require("../prompts/templates.js");

async function queryHandler(req, res) {
  try {
    const { query, conversationId } = req.body || {};
    const result = await runCommandCenterQuery(req, { query, conversationId });
    return res.json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      code: error.code || "AI_QUERY_FAILED",
      message: error.message || "AI query failed",
    });
  }
}

async function suggestionsHandler(req, res) {
  const suggestions = filterSuggestionsForUser({
    role: req.user?.role,
    permissions: req.user?.permissions || {},
  });

  return res.json({ suggestions });
}

async function healthHandler(req, res) {
  const provider = getAiProvider();

  return res.json({
    enabled: isAiEnabled(),
    provider: resolveProviderName(),
    configured: provider.isConfigured(),
  });
}

module.exports = {
  healthHandler,
  queryHandler,
  suggestionsHandler,
};
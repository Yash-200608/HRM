const crypto = require("crypto");
const { runCommandCenterAgent } = require("../agents/commandCenterAgent.js");
const { getAiProvider, isAiEnabled } = require("../providers/providerFactory.js");
const { AI_DISCLAIMER } = require("../prompts/templates.js");
const {
  logAiQueryCompleted,
  logAiQueryFailed,
  logAiQueryStarted,
  logAiToolExecuted,
} = require("./aiAuditLogger.js");
const {
  sanitizeDataCards,
  sanitizeQuery,
  sanitizeText,
} = require("./aiOutputSanitizer.js");
const { executeTool, getToolsForRequest } = require("./aiToolRegistry.js");
const {
  getHistoryForLlm,
  recordConversationTurn,
} = require("./aiConversationMemoryService.js");

function resolveConversationId(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim().slice(0, 64);
  }
  return crypto.randomUUID();
}

async function runCommandCenterQuery(req, { query, conversationId, providerOverride = null }) {
  if (!isAiEnabled()) {
    const error = new Error("AI features are disabled");
    error.statusCode = 503;
    error.code = "AI_DISABLED";
    throw error;
  }

  const sanitizedQuery = sanitizeQuery(query);
  if (!sanitizedQuery) {
    const error = new Error("Query is required");
    error.statusCode = 400;
    error.code = "QUERY_REQUIRED";
    throw error;
  }

  const provider = providerOverride || getAiProvider();
  if (!provider.isConfigured()) {
    const error = new Error("AI provider is not configured");
    error.statusCode = 503;
    error.code = "AI_PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  const resolvedConversationId = resolveConversationId(conversationId);
  const policy = req.aiPolicy || null;
  const scope = req.aiScope || "command_center";
  const memoryEnabled = policy?.memory?.enabled !== false;

  await logAiQueryStarted(req, {
    query: sanitizedQuery,
    conversationId: resolvedConversationId,
  });

  const { ctx, providerTools } = getToolsForRequest(req);

  let historyMessages = [];
  if (memoryEnabled && req.user?.companyId && conversationId) {
    historyMessages = await getHistoryForLlm({
      organizationId: req.user.companyId,
      userId: req.user.id,
      conversationId: resolvedConversationId,
      maxMessages: policy?.memory?.contextWindowMessages ?? 10,
    });
  }

  try {
    const result = await runCommandCenterAgent({
      query: sanitizedQuery,
      ctx,
      provider,
      tools: providerTools,
      historyMessages,
      executeToolFn: executeTool,
      onToolExecuted: async (toolName, toolResult) => {
        await logAiToolExecuted(req, {
          toolName,
          success: toolResult.success,
          error: toolResult.error,
        });
      },
    });

    let persistedConversationId = resolvedConversationId;
    if (memoryEnabled && req.user?.companyId) {
      const memoryResult = await recordConversationTurn({
        organizationId: req.user.companyId,
        userId: req.user.id,
        conversationId: resolvedConversationId,
        scope,
        userMessage: sanitizedQuery,
        assistantMessage: sanitizeText(result.answer),
        toolsUsed: result.toolsUsed,
        pendingActionCount: Array.isArray(result.pendingActions) ? result.pendingActions.length : 0,
        retentionDays: policy?.memory?.retentionDays ?? 30,
        policyEnabled: true,
      });
      if (memoryResult.conversationId) {
        persistedConversationId = memoryResult.conversationId;
      }
    }

    const response = {
      answer: sanitizeText(result.answer),
      dataCards: sanitizeDataCards(result.dataCards),
      pendingActions: Array.isArray(result.pendingActions) ? result.pendingActions : [],
      toolsUsed: result.toolsUsed,
      conversationId: persistedConversationId,
      scope,
      disclaimer: result.pendingActions?.length
        ? `${AI_DISCLAIMER} Pending actions require your explicit confirmation before execution.`
        : AI_DISCLAIMER,
    };

    await logAiQueryCompleted(req, {
      conversationId: persistedConversationId,
      toolsUsed: response.toolsUsed,
    });

    return response;
  } catch (error) {
    await logAiQueryFailed(req, {
      conversationId: resolvedConversationId,
      reason: error.message || "unknown_error",
    });
    throw error;
  }
}

module.exports = {
  runCommandCenterQuery,
};
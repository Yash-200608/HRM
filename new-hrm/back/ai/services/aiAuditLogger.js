const { recordAuditEvent } = require("../../service/auditService.js");

async function logAiEvent(req, event) {
  return recordAuditEvent({
    actorId: req.user?.id ?? null,
    actorRole: req.user?.role ?? null,
    companyId: req.user?.companyId ?? null,
    action: event.action,
    resourceType: event.resourceType || "ai",
    resourceId: event.resourceId || null,
    correlationId: req.correlationId ?? null,
    metadata: {
      path: req.originalUrl,
      method: req.method,
      ...(event.metadata || {}),
    },
  });
}

async function logAiQueryStarted(req, { query, conversationId }) {
  return logAiEvent(req, {
    action: "AI_QUERY_STARTED",
    resourceId: conversationId,
    metadata: {
      queryLength: query?.length || 0,
      agent: "command_center",
    },
  });
}

async function logAiToolExecuted(req, { toolName, success, error }) {
  return logAiEvent(req, {
    action: "AI_TOOL_EXECUTED",
    resourceId: toolName,
    metadata: { success, error: error || null },
  });
}

async function logAiQueryCompleted(req, { conversationId, toolsUsed }) {
  return logAiEvent(req, {
    action: "AI_QUERY_COMPLETED",
    resourceId: conversationId,
    metadata: { toolsUsed },
  });
}

async function logAiQueryFailed(req, { conversationId, reason }) {
  return logAiEvent(req, {
    action: "AI_QUERY_FAILED",
    resourceId: conversationId,
    metadata: { reason },
  });
}

async function logAiQueryDenied(req, { reason }) {
  return logAiEvent(req, {
    action: "AI_QUERY_DENIED",
    metadata: { reason },
  });
}

async function logAiDraftCreated(req, { draftId, actionType }) {
  return logAiEvent(req, {
    action: "AI_DRAFT_CREATED",
    resourceId: draftId,
    metadata: { actionType },
  });
}

async function logAiActionConfirmed(req, { draftId, actionType }) {
  return logAiEvent(req, {
    action: "AI_ACTION_CONFIRMED",
    resourceId: draftId,
    metadata: { actionType },
  });
}

async function logAiActionExecuted(req, { draftId, actionType, result }) {
  return logAiEvent(req, {
    action: "AI_ACTION_EXECUTED",
    resourceId: draftId,
    metadata: { actionType, resultSummary: result?.summary || null },
  });
}

async function logAiActionCancelled(req, { draftId, actionType }) {
  return logAiEvent(req, {
    action: "AI_ACTION_CANCELLED",
    resourceId: draftId,
    metadata: { actionType },
  });
}

module.exports = {
  logAiActionCancelled,
  logAiActionConfirmed,
  logAiActionExecuted,
  logAiDraftCreated,
  logAiQueryCompleted,
  logAiQueryDenied,
  logAiQueryFailed,
  logAiQueryStarted,
  logAiToolExecuted,
};
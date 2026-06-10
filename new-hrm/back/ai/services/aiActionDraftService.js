const crypto = require("crypto");
const AiActionDraft = require("../../models/personalOffice/aiActionDraftModel.js");
const { recordAuditEvent } = require("../../service/auditService.js");
const { logAiActionCancelled } = require("./aiAuditLogger.js");

const DRAFT_TTL_MS = Number(process.env.AI_DRAFT_TTL_MS || 24 * 60 * 60 * 1000);

function assertDraftAccess(draft, req) {
  if (!draft) {
    const error = new Error("Action draft not found");
    error.statusCode = 404;
    error.code = "DRAFT_NOT_FOUND";
    throw error;
  }

  if (String(draft.organizationId) !== String(req.user?.companyId)) {
    const error = new Error("Draft does not belong to this organization");
    error.statusCode = 403;
    error.code = "DRAFT_FORBIDDEN";
    throw error;
  }

  const isOwner = String(draft.createdByUserId) === String(req.user?.id);
  const isAdmin = req.user?.role === "admin" || req.user?.role === "super_admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to access this draft");
    error.statusCode = 403;
    error.code = "DRAFT_FORBIDDEN";
    throw error;
  }
}

function ensureDraftPending(draft) {
  if (draft.status !== "PENDING") {
    const error = new Error(`Draft is already ${draft.status.toLowerCase()}`);
    error.statusCode = 409;
    error.code = "DRAFT_NOT_PENDING";
    throw error;
  }

  if (draft.expiresAt && new Date(draft.expiresAt).getTime() < Date.now()) {
    const error = new Error("Action draft has expired");
    error.statusCode = 410;
    error.code = "DRAFT_EXPIRED";
    throw error;
  }
}

async function createActionDraft(ctx, { actionType, payload, preview, toolName }) {
  if (!ctx.companyId) {
    throw new Error("Organization context is required");
  }

  const draftId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);

  await recordAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.role,
    companyId: ctx.companyId,
    action: "AI_DRAFT_CREATED",
    resourceType: "ai_action_draft",
    resourceId: draftId,
    correlationId: ctx.correlationId || null,
    metadata: { actionType, toolName: toolName || actionType },
  });

  const draft = await AiActionDraft.create({
    draftId,
    organizationId: String(ctx.companyId),
    createdByUserId: String(ctx.userId),
    createdByRole: ctx.role,
    actionType,
    toolName: toolName || actionType,
    payload,
    preview,
    status: "PENDING",
    expiresAt,
    correlationId: ctx.correlationId || null,
  });

  return {
    draftId: draft.draftId,
    actionType: draft.actionType,
    preview: draft.preview,
    requiresConfirmation: true,
    expiresAt: draft.expiresAt,
  };
}

async function getActionDraft(req, draftId) {
  const draft = await AiActionDraft.findOne({ draftId }).lean();
  assertDraftAccess(draft, req);
  return draft;
}

async function cancelActionDraft(req, draftId) {
  const draft = await AiActionDraft.findOne({ draftId });
  assertDraftAccess(draft, req);
  ensureDraftPending(draft);

  draft.status = "CANCELLED";
  await draft.save();

  await logAiActionCancelled(req, {
    draftId,
    actionType: draft.actionType,
  });

  return {
    draftId: draft.draftId,
    status: draft.status,
  };
}

async function markDraftExecuted(draft, result) {
  draft.status = "EXECUTED";
  draft.executedAt = new Date();
  draft.executionResult = result;
  await draft.save();
  return draft;
}

async function markDraftFailed(draft, errorMessage) {
  draft.status = "FAILED";
  draft.executionError = errorMessage;
  await draft.save();
  return draft;
}

module.exports = {
  cancelActionDraft,
  createActionDraft,
  ensureDraftPending,
  getActionDraft,
  markDraftExecuted,
  markDraftFailed,
};
const AiActionDraft = require("../../models/personalOffice/aiActionDraftModel.js");
const {
  ensureDraftPending,
  getActionDraft,
  markDraftExecuted,
  markDraftFailed,
} = require("./aiActionDraftService.js");
const { executeActionDraft } = require("./aiActionExecutorService.js");
const {
  logAiActionConfirmed,
  logAiActionExecuted,
} = require("./aiAuditLogger.js");

async function confirmActionDraft(req, draftId) {
  const draft = await AiActionDraft.findOne({ draftId });
  if (!draft) {
    const error = new Error("Action draft not found");
    error.statusCode = 404;
    error.code = "DRAFT_NOT_FOUND";
    throw error;
  }

  const leanDraft = await getActionDraft(req, draftId);
  ensureDraftPending(leanDraft);

  await logAiActionConfirmed(req, {
    draftId,
    actionType: leanDraft.actionType,
  });

  try {
    const result = await executeActionDraft(req, draft);
    await markDraftExecuted(draft, result);

    await logAiActionExecuted(req, {
      draftId,
      actionType: draft.actionType,
      result,
    });

    return {
      draftId: draft.draftId,
      actionType: draft.actionType,
      status: "EXECUTED",
      result,
    };
  } catch (error) {
    await markDraftFailed(draft, error.message || "Execution failed");
    throw error;
  }
}

module.exports = {
  confirmActionDraft,
};
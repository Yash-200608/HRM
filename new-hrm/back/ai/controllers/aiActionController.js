const {
  cancelActionDraft,
  getActionDraft,
} = require("../services/aiActionDraftService.js");
const { confirmActionDraft } = require("../services/aiActionConfirmService.js");

async function getDraftHandler(req, res) {
  try {
    const draft = await getActionDraft(req, req.params.draftId);
    return res.json({
      draftId: draft.draftId,
      actionType: draft.actionType,
      status: draft.status,
      preview: draft.preview,
      expiresAt: draft.expiresAt,
      createdAt: draft.createdAt,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "DRAFT_LOOKUP_FAILED",
      message: error.message || "Unable to load action draft",
    });
  }
}

async function confirmDraftHandler(req, res) {
  try {
    const result = await confirmActionDraft(req, req.params.draftId);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "DRAFT_CONFIRM_FAILED",
      message: error.message || "Unable to confirm action draft",
    });
  }
}

async function cancelDraftHandler(req, res) {
  try {
    const result = await cancelActionDraft(req, req.params.draftId);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      code: error.code || "DRAFT_CANCEL_FAILED",
      message: error.message || "Unable to cancel action draft",
    });
  }
}

module.exports = {
  cancelDraftHandler,
  confirmDraftHandler,
  getDraftHandler,
};
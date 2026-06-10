const mongoose = require("mongoose");

const AI_ACTION_TYPES = [
  "draftLeaveRequest",
  "draftAnnouncement",
  "createWorkflowDraft",
  "scheduleReviewReminder",
];

const aiActionDraftSchema = new mongoose.Schema(
  {
    draftId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdByUserId: {
      type: String,
      required: true,
      index: true,
    },
    createdByRole: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: AI_ACTION_TYPES,
      required: true,
      index: true,
    },
    toolName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED", "EXECUTED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    preview: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    executedAt: {
      type: Date,
      default: null,
    },
    executionResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    executionError: {
      type: String,
      default: null,
    },
    correlationId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

aiActionDraftSchema.index({ organizationId: 1, createdByUserId: 1, status: 1 });
aiActionDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("AiActionDraft", aiActionDraftSchema, "ai_action_drafts");
module.exports.AI_ACTION_TYPES = AI_ACTION_TYPES;
const mongoose = require("mongoose");

const workflowStepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assigneeRole: { type: String, default: "hr" },
    dueInDays: { type: Number, default: 1, min: 0 },
    action: { type: String, default: "notify" },
  },
  { _id: false }
);

const workflowDraftSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    trigger: { type: String, required: true, trim: true },
    steps: {
      type: [workflowStepSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    source: {
      type: String,
      default: "ai",
    },
    createdBy: {
      type: String,
      required: true,
    },
    aiActionDraftId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkflowDraft", workflowDraftSchema, "workflow_drafts");
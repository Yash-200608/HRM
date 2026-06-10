/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { createActionDraft } = require("../../services/aiActionDraftService.js");
const { sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const scheduleReviewReminderTool = {
  name: "scheduleReviewReminder",
  description:
    "Draft a reminder notification to a performance reviewer about a pending review. Requires confirmation before sending.",
  kind: "action",
  parameters: {
    type: "object",
    properties: {
      reviewId: { type: "string", description: "Performance review MongoDB ID." },
      employeeId: { type: "string", description: "Employee ID if reviewId is unknown." },
      cycleId: { type: "string", description: "Optional performance cycle ID." },
      reminderMessage: { type: "string", description: "Custom reminder message." },
    },
    additionalProperties: false,
  },
  requiredModules: ["performance"],
  requiredActions: [{ module: "performance", action: "create" }],
  execute: async (ctx, args) => {
    const payload = sanitizeToolArgs(args);

    if (!payload.reviewId && !payload.employeeId) {
      throw new Error("reviewId or employeeId is required");
    }

    const preview = {
      action: "Send performance review reminder",
      reviewId: payload.reviewId || null,
      employeeId: payload.employeeId || null,
      cycleId: payload.cycleId || null,
      reminderMessage: payload.reminderMessage || null,
    };

    const draft = await createActionDraft(ctx, {
      actionType: "scheduleReviewReminder",
      toolName: "scheduleReviewReminder",
      payload,
      preview,
    });

    return {
      data: draft,
      summary: "Review reminder draft created. Confirmation required before sending.",
      requiresConfirmation: true,
      draftId: draft.draftId,
      actionType: draft.actionType,
    };
  },
};

module.exports = {
  scheduleReviewReminderTool,
};
/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { createActionDraft } = require("../../services/aiActionDraftService.js");
const { sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const draftLeaveRequestTool = {
  name: "draftLeaveRequest",
  description:
    "Draft a leave request for the current user or a specified employee (admin only). Returns a confirmation draft — does not submit until confirmed.",
  kind: "action",
  parameters: {
    type: "object",
    properties: {
      leaveTypeId: { type: "string", description: "Leave type MongoDB ID." },
      leaveTypeName: { type: "string", description: "Leave type name if ID is unknown." },
      fromDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
      toDate: { type: "string", description: "End date (YYYY-MM-DD)." },
      description: { type: "string", description: "Reason for leave." },
      targetEmployeeId: {
        type: "string",
        description: "Optional employee ID. Admins only; defaults to requester.",
      },
    },
    required: ["fromDate", "toDate"],
    additionalProperties: false,
  },
  requiredModules: ["leave"],
  requiredActions: [{ module: "leave", action: "create" }],
  execute: async (ctx, args) => {
    const payload = sanitizeToolArgs(args);

    if (!payload.leaveTypeId && !payload.leaveTypeName) {
      throw new Error("leaveTypeId or leaveTypeName is required");
    }

    const preview = {
      action: "Submit leave request",
      leaveType: payload.leaveTypeName || payload.leaveTypeId,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      description: payload.description || "",
      targetEmployeeId: payload.targetEmployeeId || ctx.userId,
    };

    const draft = await createActionDraft(ctx, {
      actionType: "draftLeaveRequest",
      toolName: "draftLeaveRequest",
      payload,
      preview,
    });

    return {
      data: draft,
      summary: "Leave request draft created. User confirmation required before submission.",
      requiresConfirmation: true,
      draftId: draft.draftId,
      actionType: draft.actionType,
    };
  },
};

module.exports = {
  draftLeaveRequestTool,
};
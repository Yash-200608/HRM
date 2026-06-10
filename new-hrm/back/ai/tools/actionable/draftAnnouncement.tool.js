/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { createActionDraft } = require("../../services/aiActionDraftService.js");
const { sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const draftAnnouncementTool = {
  name: "draftAnnouncement",
  description:
    "Draft an organization announcement to be sent as notifications. Requires confirmation before sending.",
  kind: "action",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Announcement title." },
      message: { type: "string", description: "Announcement body text." },
      audience: {
        type: "string",
        enum: ["all", "employees", "admins", "department"],
        description: "Target audience. Default all active employees.",
      },
      departmentId: {
        type: "string",
        description: "Required when audience is department.",
      },
    },
    required: ["message"],
    additionalProperties: false,
  },
  requiredEntitlements: ["announcements"],
  adminOnly: true,
  execute: async (ctx, args) => {
    const payload = sanitizeToolArgs(args);
    const audience = payload.audience || "all";

    const preview = {
      action: "Send announcement",
      title: payload.title || "Announcement",
      message: payload.message,
      audience,
      departmentId: payload.departmentId || null,
    };

    const draft = await createActionDraft(ctx, {
      actionType: "draftAnnouncement",
      toolName: "draftAnnouncement",
      payload: { ...payload, audience },
      preview,
    });

    return {
      data: draft,
      summary: "Announcement draft created. Confirmation required before sending.",
      requiresConfirmation: true,
      draftId: draft.draftId,
      actionType: draft.actionType,
    };
  },
};

module.exports = {
  draftAnnouncementTool,
};
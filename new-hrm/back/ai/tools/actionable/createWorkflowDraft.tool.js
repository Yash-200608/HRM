/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { createActionDraft } = require("../../services/aiActionDraftService.js");
const { sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const createWorkflowDraftTool = {
  name: "createWorkflowDraft",
  description:
    "Create a workflow automation draft from plain English instructions. Example: when an employee joins, assign onboarding tasks and notify HR. Requires confirmation before saving.",
  kind: "action",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Workflow name." },
      trigger: { type: "string", description: "Plain English trigger condition." },
      description: { type: "string", description: "Workflow summary." },
      steps: {
        type: "array",
        description: "Ordered workflow steps.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            assigneeRole: { type: "string" },
            dueInDays: { type: "number" },
            action: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    required: ["name", "trigger", "steps"],
    additionalProperties: false,
  },
  requiredModules: ["tasks"],
  requiredEntitlements: ["workflowAutomation"],
  requiredActions: [{ module: "tasks", action: "create" }],
  execute: async (ctx, args) => {
    const payload = sanitizeToolArgs(args);

    if (!Array.isArray(payload.steps) || !payload.steps.length) {
      throw new Error("At least one workflow step is required");
    }

    const preview = {
      action: "Save workflow draft",
      name: payload.name,
      trigger: payload.trigger,
      description: payload.description || "",
      stepCount: payload.steps.length,
      steps: payload.steps,
    };

    const draft = await createActionDraft(ctx, {
      actionType: "createWorkflowDraft",
      toolName: "createWorkflowDraft",
      payload,
      preview,
    });

    return {
      data: draft,
      summary: `Workflow draft "${payload.name}" prepared with ${payload.steps.length} step(s). Confirmation required.`,
      requiresConfirmation: true,
      draftId: draft.draftId,
      actionType: draft.actionType,
    };
  },
};

module.exports = {
  createWorkflowDraftTool,
};
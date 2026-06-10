/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getPendingLeaves } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const getPendingLeavesTool = {
  name: "getPendingLeaves",
  description:
    "List pending leave approval requests for the organization, including employee, leave type, dates, and total days. Read-only.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of pending requests to return (1-100). Default 50.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["leave"],
  execute: async (ctx, args) => {
    const data = await getPendingLeaves(ctx.companyId, args);
    return {
      data,
      summary: `${data.totalPending} pending leave request(s) found.`,
    };
  },
};

module.exports = {
  getPendingLeavesTool,
};
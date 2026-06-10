/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getTeamPerformanceSummary } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const getTeamPerformanceSummaryTool = {
  name: "getTeamPerformanceSummary",
  description:
    "Get team performance review summary for the active or specified cycle, including average ratings, pending reviews, top performers, and employees needing attention. Read-only.",
  parameters: {
    type: "object",
    properties: {
      cycleId: {
        type: "string",
        description: "Optional performance cycle ID. Defaults to active/latest cycle.",
      },
      departmentId: {
        type: "string",
        description: "Optional department ID to narrow results.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["performance"],
  execute: async (ctx, args) => {
    const data = await getTeamPerformanceSummary(ctx.companyId, args);
    return {
      data,
      summary: data.cycle
        ? `Cycle "${data.cycle.name}": ${data.summary.pendingReviews} pending, avg rating ${data.summary.averageRating ?? "n/a"}.`
        : data.message,
    };
  },
};

module.exports = {
  getTeamPerformanceSummaryTool,
};
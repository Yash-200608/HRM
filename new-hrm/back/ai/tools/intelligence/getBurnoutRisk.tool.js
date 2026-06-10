/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getBurnoutRiskIndicators } = require("../../services/intelligence/burnoutRiskService.js");

/** @type {ToolDefinition} */
const getBurnoutRiskTool = {
  name: "getBurnoutRisk",
  description:
    "Detect burnout risk indicators from overtime, absences, late arrivals, half-days, and average working hours. Includes department trend analysis. Read-only.",
  kind: "read",
  parameters: {
    type: "object",
    properties: {
      lookbackDays: {
        type: "number",
        description: "Days of attendance history to analyze. Default 30.",
      },
      limit: {
        type: "number",
        description: "Maximum at-risk employees to return (1-50). Default 15.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["attendance"],
  execute: async (ctx, args) => {
    const data = await getBurnoutRiskIndicators(ctx.companyId, args);
    return {
      data,
      summary: `${data.summary.atRiskCount} employee(s) show burnout risk indicators (${data.summary.criticalCount} critical).`,
    };
  },
};

module.exports = {
  getBurnoutRiskTool,
};
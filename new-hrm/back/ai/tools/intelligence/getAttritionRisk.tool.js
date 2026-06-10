/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getAttritionRiskIndicators } = require("../../services/intelligence/attritionRiskService.js");

/** @type {ToolDefinition} */
const getAttritionRiskTool = {
  name: "getAttritionRisk",
  description:
    "Analyze attrition risk indicators for active employees using resignation status, attendance, performance ratings, and leave patterns. Read-only predictive intelligence.",
  kind: "read",
  parameters: {
    type: "object",
    properties: {
      lookbackDays: {
        type: "number",
        description: "Days of history to analyze. Default 60.",
      },
      limit: {
        type: "number",
        description: "Maximum at-risk employees to return (1-50). Default 15.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["employees"],
  execute: async (ctx, args) => {
    const data = await getAttritionRiskIndicators(ctx.companyId, args);
    return {
      data,
      summary: `${data.summary.atRiskCount} employee(s) show elevated attrition risk (${data.summary.criticalCount} critical).`,
    };
  },
};

module.exports = {
  getAttritionRiskTool,
};
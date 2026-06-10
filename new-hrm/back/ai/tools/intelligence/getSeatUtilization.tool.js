/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getSeatUtilizationAnalysis } = require("../../services/intelligence/seatUtilizationService.js");

/** @type {ToolDefinition} */
const getSeatUtilizationTool = {
  name: "getSeatUtilization",
  description:
    "Analyze subscription seat utilization, churn risk signals, billing anomalies, and upgrade recommendations for the organization. Admin read-only intelligence.",
  kind: "read",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  adminOnly: true,
  execute: async (ctx, args) => {
    const data = await getSeatUtilizationAnalysis(ctx.companyId, args);
    return {
      data,
      summary: data.seats.utilizationPercent != null
        ? `Seat utilization is ${data.seats.utilizationPercent}% with ${data.churnRisk.level} churn risk.`
        : `Active employees: ${data.seats.activeEmployees}. Churn risk: ${data.churnRisk.level}.`,
    };
  },
};

module.exports = {
  getSeatUtilizationTool,
};
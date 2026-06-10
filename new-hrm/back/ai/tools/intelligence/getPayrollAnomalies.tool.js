/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getPayrollAnomalies } = require("../../services/intelligence/payrollAnomalyService.js");

/** @type {ToolDefinition} */
const getPayrollAnomaliesTool = {
  name: "getPayrollAnomalies",
  description:
    "Detect payroll anomalies such as duplicate entries, missing active-employee payroll, salary swings, department cost changes, and salary outliers. Read-only.",
  kind: "read",
  parameters: {
    type: "object",
    properties: {
      month: {
        type: "string",
        description: "Analysis month in YYYY-MM format. Defaults to current month.",
      },
      year: {
        type: "number",
        description: "Optional year override when month is numeric.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["payroll"],
  execute: async (ctx, args) => {
    const data = await getPayrollAnomalies(ctx.companyId, args);
    return {
      data,
      summary: `${data.summary.anomalyCount} payroll anomaly(ies) found (${data.summary.highSeverityCount} high severity).`,
    };
  },
};

module.exports = {
  getPayrollAnomaliesTool,
};
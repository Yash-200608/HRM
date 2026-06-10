/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getDepartmentPayrollCost } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const getDepartmentPayrollCostTool = {
  name: "getDepartmentPayrollCost",
  description:
    "Get payroll cost grouped by department for a given month and year, including totals and averages. Read-only.",
  parameters: {
    type: "object",
    properties: {
      month: {
        type: "string",
        description: "Month as YYYY-MM or month number (1-12). Defaults to current month.",
      },
      year: {
        type: "number",
        description: "Four-digit year. Defaults to current year.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["payroll"],
  execute: async (ctx, args) => {
    const data = await getDepartmentPayrollCost(ctx.companyId, args);
    return {
      data,
      summary: `Payroll total ${data.organizationTotal} across ${data.departments.length} department(s) for ${data.period.month} ${data.period.year}.`,
    };
  },
};

module.exports = {
  getDepartmentPayrollCostTool,
};
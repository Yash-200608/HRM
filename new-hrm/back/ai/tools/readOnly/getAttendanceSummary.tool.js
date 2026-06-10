/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getAttendanceSummary } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const getAttendanceSummaryTool = {
  name: "getAttendanceSummary",
  description:
    "Get organization attendance analytics for a month, including average attendance percentage, department breakdown, and employees below a threshold (default 80%). Read-only.",
  parameters: {
    type: "object",
    properties: {
      month: {
        type: "string",
        description: "Month in YYYY-MM format. Defaults to current month.",
      },
      threshold: {
        type: "number",
        description: "Attendance percentage threshold. Employees below this are listed. Default 80.",
      },
      departmentId: {
        type: "string",
        description: "Optional department ID to filter employees.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["attendance"],
  execute: async (ctx, args) => {
    const data = await getAttendanceSummary(ctx.companyId, args);
    return {
      data,
      summary: `${data.organizationSummary.employeesBelowThreshold} employee(s) below ${data.threshold}% attendance in ${data.period.monthKey}.`,
    };
  },
};

module.exports = {
  getAttendanceSummaryTool,
};
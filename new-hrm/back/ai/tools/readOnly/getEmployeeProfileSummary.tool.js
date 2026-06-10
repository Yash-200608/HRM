/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const { getEmployeeProfileSummary } = require("../../../service/hrAnalyticsReadService.js");

/** @type {ToolDefinition} */
const getEmployeeProfileSummaryTool = {
  name: "getEmployeeProfileSummary",
  description:
    "Get summarized employee profiles for the organization. Supports lookup by employee ID, department, status, or name/email search. Read-only.",
  parameters: {
    type: "object",
    properties: {
      employeeId: {
        type: "string",
        description: "Optional employee MongoDB ID for a single profile lookup.",
      },
      search: {
        type: "string",
        description: "Optional search term matched against name, email, or employee code.",
      },
      departmentId: {
        type: "string",
        description: "Optional department ID filter.",
      },
      status: {
        type: "string",
        description: "Optional employee status filter (ACTIVE, RELIEVED, ON_HOLD).",
      },
      limit: {
        type: "number",
        description: "Maximum profiles to return (1-50). Default 20.",
      },
    },
    additionalProperties: false,
  },
  requiredModules: ["employees"],
  execute: async (ctx, args) => {
    const data = await getEmployeeProfileSummary(ctx.companyId, args);
    return {
      data,
      summary: `${data.count} employee profile(s) returned.`,
    };
  },
};

module.exports = {
  getEmployeeProfileSummaryTool,
};
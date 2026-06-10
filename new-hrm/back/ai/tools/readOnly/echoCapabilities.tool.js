/** @typedef {import('../tool.types.js').ToolDefinition} ToolDefinition */

const MODULE_LABELS = {
  attendance: "Attendance summaries and low-attendance reports",
  leave: "Pending leave approvals and leave balances",
  payroll: "Payroll cost by department",
  reports: "Cross-module HR analytics",
  employees: "Employee profile summaries",
  performance: "Team performance insights",
};

/** @type {ToolDefinition} */
const echoCapabilitiesTool = {
  name: "getAvailableCapabilities",
  description:
    "Returns the HR analytics capabilities available to the current user based on their permissions and plan. Use when the user asks what you can do.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  execute: async (ctx) => {
    const capabilities = [];
    const permissions = ctx.permissions || {};

    if (ctx.role === "admin" || ctx.role === "super_admin") {
      capabilities.push(
        "Organization-wide HR analytics across all entitled modules",
        "Attendance summaries and low-attendance reports (getAttendanceSummary)",
        "Pending leave approvals (getPendingLeaves)",
        "Payroll cost by department (getDepartmentPayrollCost)",
        "Employee profile summaries (getEmployeeProfileSummary)",
        "Team performance insights (getTeamPerformanceSummary)",
        "Attrition risk indicators (getAttritionRisk)",
        "Burnout risk indicators (getBurnoutRisk)",
        "Payroll anomaly detection (getPayrollAnomalies)",
        "Seat utilization and churn analysis (getSeatUtilization)"
      );
    }

    for (const [module, label] of Object.entries(MODULE_LABELS)) {
      const modulePerms = permissions[module];
      if (modulePerms?.view) {
        capabilities.push(label);
      }
    }

    if (capabilities.length === 0) {
      capabilities.push(
        "General HR guidance",
        "Read-only analytics will expand as module permissions are granted"
      );
    }

    return {
      data: {
        capabilities,
        phase: "Phase 4 — predictive intelligence tools active",
        entitledModules: Object.keys(permissions).filter((key) => permissions[key]?.view),
      },
      summary: `User has access to ${capabilities.length} capability area(s).`,
    };
  },
};

module.exports = {
  echoCapabilitiesTool,
};
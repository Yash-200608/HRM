const TOOL_DISPLAY_LABELS = {
  getAttendanceSummary: "Attendance overview",
  getPendingLeaves: "Pending leave requests",
  getEmployeeProfileSummary: "Employee profile",
  getDepartmentPayrollCost: "Department payroll",
  getTeamPerformanceSummary: "Team performance",
  getAttritionRisk: "Attrition risk",
  getBurnoutRisk: "Burnout risk",
  getPayrollAnomalies: "Payroll anomalies",
  getSeatUtilization: "Subscription seats",
  getAvailableCapabilities: "Available capabilities",
  echoCapabilities: "Available capabilities",
};

function getToolDisplayLabel(toolName) {
  if (TOOL_DISPLAY_LABELS[toolName]) {
    return TOOL_DISPLAY_LABELS[toolName];
  }

  return toolName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

module.exports = {
  TOOL_DISPLAY_LABELS,
  getToolDisplayLabel,
};
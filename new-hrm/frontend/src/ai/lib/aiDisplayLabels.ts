const TOOL_LABELS: Record<string, string> = {
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

const ACTION_LABELS: Record<string, string> = {
  draftLeaveRequest: "Leave request",
  draftAnnouncement: "Announcement",
  createWorkflowDraft: "Workflow",
  scheduleReviewReminder: "Performance review reminder",
};

export function getToolDisplayLabel(toolName: string) {
  return TOOL_LABELS[toolName] || toolName.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

export function getActionDisplayLabel(actionType: string) {
  return ACTION_LABELS[actionType] || getToolDisplayLabel(actionType);
}
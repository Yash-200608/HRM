const AI_DISCLAIMER =
  "AI-generated summary. Verify before acting on this information.";

const COMMAND_CENTER_SUGGESTIONS = [
  {
    id: "attendance-low",
    label: "Show employees with attendance below 80%",
    query: "Show employees with attendance below 80%",
    requiredModules: ["attendance"],
  },
  {
    id: "pending-leaves",
    label: "List pending leave approvals",
    query: "List all pending leave approvals",
    requiredModules: ["leave"],
  },
  {
    id: "payroll-dept",
    label: "Show payroll cost by department",
    query: "Show payroll cost by department for this month",
    requiredModules: ["payroll"],
  },
  {
    id: "capabilities",
    label: "What can you help me with?",
    query: "What HR analytics can you help me with?",
    requiredModules: [],
  },
  {
    id: "draft-leave",
    label: "Draft a leave request for next week",
    query: "Draft a leave request for next Monday to Wednesday with reason family event",
    requiredModules: ["leave"],
  },
  {
    id: "workflow-onboarding",
    label: "Create onboarding workflow",
    query: "When an employee joins, assign onboarding tasks and notify HR",
    requiredModules: ["tasks"],
  },
  {
    id: "attrition-risk",
    label: "Who is at risk of leaving?",
    query: "Show employees with elevated attrition risk and explain why",
    requiredModules: ["employees"],
  },
  {
    id: "burnout-risk",
    label: "Burnout risk indicators",
    query: "Which employees show burnout risk indicators this month?",
    requiredModules: ["attendance"],
  },
  {
    id: "payroll-anomalies",
    label: "Detect payroll anomalies",
    query: "Detect payroll anomalies for this month",
    requiredModules: ["payroll"],
  },
  {
    id: "seat-utilization",
    label: "Seat utilization analysis",
    query: "Analyze seat utilization, churn risk, and upgrade recommendations",
    requiredModules: ["billing"],
  },
];

function filterSuggestionsForUser({ role, permissions = {} }) {
  return COMMAND_CENTER_SUGGESTIONS.filter((suggestion) => {
    if (suggestion.id === "seat-utilization") {
      return role === "admin" || role === "super_admin";
    }

    if (!suggestion.requiredModules.length) {
      return true;
    }

    if (role === "admin" || role === "super_admin") {
      return true;
    }

    return suggestion.requiredModules.every((module) => permissions[module]?.view);
  });
}

module.exports = {
  AI_DISCLAIMER,
  COMMAND_CENTER_SUGGESTIONS,
  filterSuggestionsForUser,
};
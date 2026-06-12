/**
 * @typedef {'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PURGED'} CompanyStatusV1
 */

/**
 * @typedef {Object} CompanyV1
 * @property {string} [_id]
 * @property {string} name
 * @property {string} email
 * @property {string} contactNumber
 * @property {string} [website]
 * @property {string} [logo]
 * @property {string} [address]
 * @property {boolean} [isActive]
 * @property {CompanyStatusV1} [status]
 * @property {string} [planCode]
 * @property {Record<string, unknown>} [metadata]
 * @property {Date | string | null} [archivedAt]
 * @property {Date | string | null} [suspendedAt]
 */

/**
 * @typedef {Object} JwtClaimsV1
 * @property {string} id
 * @property {string} role
 * @property {string} [companyId]
 * @property {'admin' | 'employee' | 'hr' | 'manager' | 'super_admin'} [principalKind]
 * @property {number} [tokenVersion]
 * @property {string} [sessionId]
 */

/** @type {readonly string[]} */
const ENTITLEMENT_KEYS = Object.freeze([
  "employeeManagement",
  "attendance",
  "leaveManagement",
  "basicReports",
  "payroll",
  "taskManagement",
  "employeeSelfService",
  "announcements",
  "shiftManagement",
  "advancedReports",
  "auditLogs",
  "employeeDocuments",
  "customFields",
  "dataExport",
  "approvalWorkflows",
  "recruitment",
  "performanceReviews",
  "assetManagement",
  "learningManagement",
  "apiAccess",
  "workflowAutomation",
  "customBranding",
  "sso",
  "whiteLabel",
  "leadPortal",
  "prioritySupport",
  "customIntegrations",
  "aiAssistant",
]);

/**
 * Maps HRM RBAC module keys (Roles.tsx) to Subscription entitlement keys.
 * Modules omitted here are not plan-gated at the API layer.
 * @type {Readonly<Record<string, string>>}
 */
const HRM_MODULE_TO_ENTITLEMENT = Object.freeze({
  employees: "employeeManagement",
  departments: "employeeManagement",
  Resignation: "employeeManagement",
  resignation: "employeeManagement",
  attendance: "attendance",
  leave: "leaveManagement",
  attendancereport: "basicReports",
  reports: "advancedReports",
  payroll: "payroll",
  tasks: "taskManagement",
  tasks_dashboard: "taskManagement",
  projects: "taskManagement",
  subtasks: "taskManagement",
  overdue_tasks: "taskManagement",
  task_manager: "taskManagement",
  jobportal: "recruitment",
  job_dashboard: "recruitment",
  job_companies: "recruitment",
  jobs: "recruitment",
  job_applications: "recruitment",
  job_candidates: "recruitment",
  job_revenue: "recruitment",
  job_settings: "recruitment",
  job_roles: "recruitment",
  leadportal: "leadPortal",
  lead_list: "leadPortal",
  lead_orders: "leadPortal",
  lead_products: "leadPortal",
  expenses: "basicReports",
  holiday: "leaveManagement",
  performance: "performanceReviews",
  assets: "assetManagement",
  learning: "learningManagement",
  ai: "aiAssistant",
  command_center: "aiAssistant",
});

const COMPANY_STATUS_VALUES = Object.freeze(["ACTIVE", "SUSPENDED", "ARCHIVED", "PURGED"]);

function resolveModuleEntitlement(moduleName) {
  if (!moduleName || typeof moduleName !== "string") {
    return null;
  }
  return HRM_MODULE_TO_ENTITLEMENT[moduleName] ?? null;
}

function isEntitlementKey(value) {
  return typeof value === "string" && ENTITLEMENT_KEYS.includes(value);
}

module.exports = {
  COMPANY_STATUS_VALUES,
  ENTITLEMENT_KEYS,
  HRM_MODULE_TO_ENTITLEMENT,
  isEntitlementKey,
  resolveModuleEntitlement,
};
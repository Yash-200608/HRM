export type CompanyStatusV1 = "ACTIVE" | "SUSPENDED" | "ARCHIVED" | "PURGED";

export interface CompanyV1 {
  _id?: string;
  name: string;
  email: string;
  contactNumber: string;
  website?: string;
  logo?: string;
  address?: string;
  isActive?: boolean;
  status?: CompanyStatusV1;
  planCode?: string;
  metadata?: Record<string, unknown>;
  archivedAt?: Date | string | null;
  suspendedAt?: Date | string | null;
}

export interface JwtClaimsV1 {
  ver?: string;
  id: string;
  role: string;
  companyId?: string | null;
  orgId?: string | null;
  principalKind?: "admin" | "employee" | "hr" | "manager" | "super_admin";
  tokenVersion?: number;
  sessionId?: string;
  entitlements?: string[];
  subscriptionPlan?: string | null;
  permissions?: Record<string, Record<string, boolean>> | null;
}

export type EntitlementKey =
  | "employeeManagement"
  | "attendance"
  | "leaveManagement"
  | "basicReports"
  | "payroll"
  | "taskManagement"
  | "employeeSelfService"
  | "announcements"
  | "shiftManagement"
  | "advancedReports"
  | "auditLogs"
  | "employeeDocuments"
  | "customFields"
  | "dataExport"
  | "approvalWorkflows"
  | "recruitment"
  | "performanceReviews"
  | "assetManagement"
  | "learningManagement"
  | "apiAccess"
  | "workflowAutomation"
  | "customBranding"
  | "sso"
  | "whiteLabel"
  | "leadPortal"
  | "prioritySupport"
  | "customIntegrations"
  | "aiAssistant";

export const COMPANY_STATUS_VALUES: readonly CompanyStatusV1[];
export const ENTITLEMENT_KEYS: readonly EntitlementKey[];
export const HRM_MODULE_TO_ENTITLEMENT: Readonly<Record<string, EntitlementKey>>;

export function resolveModuleEntitlement(moduleName: string): EntitlementKey | null;
export function isEntitlementKey(value: string): value is EntitlementKey;
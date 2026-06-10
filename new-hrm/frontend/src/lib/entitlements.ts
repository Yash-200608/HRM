/**
 * Mirrors packages/shared-types HRM_MODULE_TO_ENTITLEMENT for client-side plan gating.
 */
const MODULE_TO_ENTITLEMENT: Record<string, string> = {
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
  expenses: "approvalWorkflows",
  holiday: "leaveManagement",
  performance: "performanceReviews",
  assets: "assetManagement",
  learning: "learningManagement",
};

export function resolveModuleEntitlement(moduleName?: string | null) {
  if (!moduleName) {
    return null;
  }
  return MODULE_TO_ENTITLEMENT[moduleName] ?? null;
}

export const FREE_TIER_ENTITLEMENTS = [
  "employeeManagement",
  "attendance",
  "leaveManagement",
  "basicReports",
] as const;

export function getUserEntitlements(
  user: { entitlements?: string[]; subscriptionPlan?: string | null } | null | undefined
) {
  if (Array.isArray(user?.entitlements) && user.entitlements.length > 0) {
    return user.entitlements;
  }

  const plan = (user?.subscriptionPlan || "free").toLowerCase();
  if (plan === "free") {
    return [...FREE_TIER_ENTITLEMENTS];
  }

  return [];
}

export function hasEntitlement(
  user: { role?: string; entitlements?: string[] } | null | undefined,
  entitlementKey: string
) {
  if (!user) {
    return false;
  }

  if (user.role === "super_admin") {
    return true;
  }

  return getUserEntitlements(user).includes(entitlementKey);
}

export function canAccessModule(
  user: { role?: string; entitlements?: string[] } | null | undefined,
  moduleName: string
) {
  if (!user) {
    return false;
  }

  if (user.role === "super_admin") {
    return true;
  }

  const entitlementKey = resolveModuleEntitlement(moduleName);
  if (!entitlementKey) {
    return true;
  }

  return hasEntitlement(user, entitlementKey);
}

export function applyEntitlementsToStoredUser(
  entitlements: string[],
  subscriptionPlan?: string | null
) {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    const user = JSON.parse(raw);
    const nextUser = {
      ...user,
      entitlements,
      subscriptionPlan: subscriptionPlan ?? user.subscriptionPlan ?? null,
    };
    localStorage.setItem("user", JSON.stringify(nextUser));
    return nextUser;
  } catch {
    return null;
  }
}

export function readEntitlementsFromAccessToken(): {
  entitlements: string[];
  subscriptionPlan: string | null;
} {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const storedUser = JSON.parse(rawUser) as {
        entitlements?: string[];
        subscriptionPlan?: string | null;
      };
      if (storedUser.entitlements?.length || storedUser.subscriptionPlan) {
        return {
          entitlements: Array.isArray(storedUser.entitlements) ? storedUser.entitlements : [],
          subscriptionPlan: storedUser.subscriptionPlan ? String(storedUser.subscriptionPlan) : null,
        };
      }
    }
  } catch {
    // fall through to legacy token parsing
  }

  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (!token) {
    return { entitlements: [], subscriptionPlan: null };
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return {
      entitlements: Array.isArray(payload.entitlements) ? payload.entitlements : [],
      subscriptionPlan: payload.subscriptionPlan ? String(payload.subscriptionPlan) : null,
    };
  } catch {
    return { entitlements: [], subscriptionPlan: null };
  }
}
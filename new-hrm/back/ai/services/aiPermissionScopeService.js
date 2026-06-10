const { Employee } = require("../../models/personalOffice/employeeModel.js");
const { evaluateToolAgainstPolicy } = require("./aiPolicyEngine.js");
const { userCanAccessTool } = require("../tools/toolRegistry.js");

const SCOPE_TOOL_ALLOWLIST = {
  employee_copilot: new Set([
    "getAvailableCapabilities",
    "getEmployeeProfileSummary",
    "getPendingLeaves",
    "draftLeaveRequest",
  ]),
  manager_copilot: null,
  command_center: null,
};

async function isDepartmentManager(userId, companyId) {
  const employee = await Employee.findById(userId)
    .populate("department", "managers")
    .lean();

  if (!employee?.department?.managers?.length) {
    return false;
  }

  return employee.department.managers.some(
    (managerId) => String(managerId) === String(userId)
  );
}

async function resolveAiScope(req) {
  const user = req.user;
  if (!user) {
    return "command_center";
  }

  if (user.role === "admin" || user.role === "super_admin") {
    return "command_center";
  }

  if (user.role === "employee") {
    const manager = await isDepartmentManager(user.id, user.companyId);
    if (manager) {
      return "manager_copilot";
    }
    return "employee_copilot";
  }

  return "command_center";
}

function toolAllowedByScope(tool, scope) {
  const allowlist = SCOPE_TOOL_ALLOWLIST[scope];
  if (!allowlist) {
    return true;
  }
  return allowlist.has(tool.name);
}

function canAccessToolWithPolicy(ctx, tool, policy, scope) {
  if (!userCanAccessTool(ctx, tool)) {
    return { allowed: false, reason: "RBAC or entitlement denied" };
  }

  if (!toolAllowedByScope(tool, scope)) {
    return { allowed: false, reason: `Tool not available in ${scope} scope` };
  }

  return evaluateToolAgainstPolicy({ tool, ctx, policy, scope });
}

function getAccessibleToolsForContext(ctx, policy, scope) {
  const { listRegisteredTools } = require("../tools/toolRegistry.js");
  return listRegisteredTools().filter((tool) => {
    const result = canAccessToolWithPolicy(ctx, tool, policy, scope);
    return result.allowed;
  });
}

module.exports = {
  canAccessToolWithPolicy,
  getAccessibleToolsForContext,
  resolveAiScope,
  SCOPE_TOOL_ALLOWLIST,
  toolAllowedByScope,
};
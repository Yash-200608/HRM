const Role = require("../../models/personalOffice/roleModel");
const { Employee } = require("../../models/personalOffice/employeeModel");
const { logAiQueryDenied } = require("./aiAuditLogger.js");

async function resolveEmployeePermissions(user) {
  const employee = await Employee.findById(user.id).select("assignedRole").lean();
  if (!employee?.assignedRole) {
    return null;
  }

  const role = await Role.findById(employee.assignedRole).select("permissions").lean();
  return role?.permissions || null;
}

function hasCommandCenterAccess(user, permissions) {
  if (!user) {
    return false;
  }

  if (user.role === "admin" || user.role === "super_admin") {
    return true;
  }

  return Boolean(permissions?.reports?.view || permissions?.ai?.view);
}

function aiPermissionGuard(scope = "commandCenter") {
  return async function permissionGuard(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let permissions = req.user.permissions || null;

      if (req.user.role !== "admin" && req.user.role !== "super_admin" && !permissions) {
        permissions = await resolveEmployeePermissions(req.user);
        req.user.permissions = permissions;
      }

      if (scope === "commandCenter" && !hasCommandCenterAccess(req.user, permissions)) {
        await logAiQueryDenied(req, { reason: "insufficient_permissions" });
        return res.status(403).json({
          code: "AI_ACCESS_DENIED",
          message: "AI Command Center requires admin access or reports view permission",
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}

module.exports = {
  aiPermissionGuard,
  hasCommandCenterAccess,
};
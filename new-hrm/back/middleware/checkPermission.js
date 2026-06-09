const Role = require("../models/personalOffice/roleModel");
const { Employee } = require("../models/personalOffice/employeeModel");
const { resolveModuleEntitlement } = require("@hrm-subscription/shared-types");
const { checkEntitlement } = require("./entitlementMiddleware.js");
const { recordAuditEvent } = require("../service/auditService.js");

async function enforceModuleEntitlement(req, res, moduleName) {
  const featureKey = resolveModuleEntitlement(moduleName);
  if (!featureKey) {
    return true;
  }

  const organizationId = req.user?.companyId;
  if (!organizationId) {
    return req.user?.role === "super_admin";
  }

  const result = await checkEntitlement(organizationId, featureKey);
  if (result.allowed) {
    return true;
  }

  await recordAuditEvent({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    companyId: organizationId,
    action: "ENTITLEMENT_DENIED",
    resourceType: "feature",
    resourceId: featureKey,
    metadata: {
      module: moduleName,
      path: req.originalUrl,
      method: req.method,
      upstreamStatus: result.upstreamStatus ?? null,
    },
  });

  res.status(403).json({
    code: "FEATURE_NOT_ENABLED",
    message: "This feature is not included in your current plan",
    feature: featureKey,
    module: moduleName,
  });
  return false;
}

module.exports = function checkPermission(moduleName, action = "view") {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.role !== "admin" && user.role !== "super_admin") {
        const employee = await Employee.findById(user.id);

        if (!employee) {
          return res.status(404).json({
            message: "Employee not found",
          });
        }

        const role = await Role.findById(employee.assignedRole);

        if (!role) {
          return res.status(404).json({
            message: "Role not found",
          });
        }

        const permissions = role.permissions || {};
        const allowed =
          permissions[moduleName] && permissions[moduleName][action] === true;

        if (!allowed) {
          return res.status(403).json({
            message: "Access denied",
          });
        }
      }

      const entitled = await enforceModuleEntitlement(req, res, moduleName);
      if (!entitled) {
        return;
      }

      next();
    } catch (err) {
      return res.status(500).json({
        message: "Permission error",
      });
    }
  };
};
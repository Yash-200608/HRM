const { Employee } = require("../models/personalOffice/employeeModel.js");
const { callSubscription } = require("./billingClient.js");

function isFailClosed() {
  if (process.env.EMPLOYEE_LIMIT_FAIL_CLOSED != null) {
    return process.env.EMPLOYEE_LIMIT_FAIL_CLOSED === "true";
  }

  return process.env.NODE_ENV === "production";
}

async function countActiveEmployees(organizationId) {
  return Employee.countDocuments({
    createdBy: organizationId,
    status: "ACTIVE",
  });
}

async function checkCanAddEmployee(organizationId, additionalEmployees = 1) {
  if (!organizationId) {
    return {
      allowed: false,
      code: "ORGANIZATION_REQUIRED",
      message: "Organization context is required",
    };
  }

  const activeCount = await countActiveEmployees(organizationId);
  const requestedEmployees = activeCount + additionalEmployees;

  try {
    const response = await callSubscription("/v1/limits/employees/check", {
      method: "POST",
      body: {
        organizationId: String(organizationId),
        requestedEmployees,
      },
      organizationId: String(organizationId),
      operation: "employee-limit-check",
      idempotent: true,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          allowed: !isFailClosed(),
          code: "SUBSCRIPTION_NOT_FOUND",
          message: "No active subscription found for this organization",
          activeCount,
          requestedEmployees,
        };
      }

      return {
        allowed: !isFailClosed(),
        code: "SUBSCRIPTION_LIMIT_CHECK_FAILED",
        message: "Unable to verify employee limit",
        activeCount,
        requestedEmployees,
      };
    }

    const result = response.data || {};

    if (result.allowed) {
      return {
        allowed: true,
        activeCount,
        requestedEmployees,
        limit: result.limit ?? null,
      };
    }

    return {
      allowed: false,
      code: result.reason || "EMPLOYEE_LIMIT_EXCEEDED",
      message: "Employee limit reached for the current plan",
      activeCount,
      requestedEmployees,
      limit: result.limit ?? null,
      upgradeRequired: true,
    };
  } catch (error) {
    return {
      allowed: !isFailClosed(),
      code: "SUBSCRIPTION_UNAVAILABLE",
      message: "Billing service unavailable",
      activeCount,
      requestedEmployees,
    };
  }
}

module.exports = {
  checkCanAddEmployee,
  countActiveEmployees,
};
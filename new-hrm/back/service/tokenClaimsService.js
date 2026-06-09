const crypto = require("crypto");
const mongoose = require("mongoose");
const Company = require("../models/personalOffice/companyModel.js");
const AccessRole = require("../models/personalOffice/roleModel.js");
const SubscriptionSnapshot = require("../models/billing/subscriptionSnapshotModel.js");
const { extractEntitlementsFromSnapshot } = require("@hrm-subscription/shared-auth");
const { getAccountTypeFromRole } = require("./sessionSecurityService.js");

const FREE_PLAN_FEATURES = {
  employeeManagement: true,
  attendance: true,
  leaveManagement: true,
  basicReports: true,
};

function resolveRoleForToken(user, accountType) {
  if (accountType === "super_admin") {
    return "super_admin";
  }

  if (accountType === "employee") {
    return user.role || "employee";
  }

  return user.role || "admin";
}

function resolveOrganizationIdForUser(user, accountType) {
  if (accountType === "super_admin") {
    return null;
  }

  if (accountType === "employee") {
    return user.createdBy?._id || user.createdBy || user.companyId || null;
  }

  return user.companyId?._id || user.companyId || null;
}

async function resolvePermissions(user, accountType) {
  if (accountType !== "employee") {
    return null;
  }

  const assignedRole = user.assignedRole;

  if (assignedRole && typeof assignedRole === "object" && assignedRole.permissions) {
    return assignedRole.permissions;
  }

  if (!assignedRole) {
    return null;
  }

  const role = await AccessRole.findById(assignedRole).select("permissions").lean();
  return role?.permissions || null;
}

async function resolvePlanFeatureSnapshot(planCode) {
  const normalizedPlanCode = planCode || "free";

  if (mongoose.connection.readyState === 1) {
    const plan = await mongoose.connection.db
      .collection("plans")
      .findOne({ code: normalizedPlanCode }, { projection: { features: 1 } });

    if (plan?.features && typeof plan.features === "object") {
      return plan.features;
    }
  }

  if (normalizedPlanCode === "free") {
    return FREE_PLAN_FEATURES;
  }

  return null;
}

async function resolveSubscriptionContext(organizationId) {
  if (!organizationId) {
    return {
      subscriptionPlan: null,
      entitlements: [],
    };
  }

  const [company, subscription] = await Promise.all([
    Company.findById(organizationId).select("planCode status").lean(),
    SubscriptionSnapshot.findOne({ organization: organizationId })
      .select("planCode featureSnapshot status")
      .lean(),
  ]);

  const subscriptionPlan = subscription?.planCode || company?.planCode || "free";
  let entitlements = extractEntitlementsFromSnapshot(subscription?.featureSnapshot);

  if (!entitlements.length) {
    const planFeatures = await resolvePlanFeatureSnapshot(subscriptionPlan);
    entitlements = extractEntitlementsFromSnapshot(planFeatures);
  }

  return {
    subscriptionPlan,
    entitlements,
  };
}

async function buildAccessTokenInput(user, options = {}) {
  const accountType = options.accountType || getAccountTypeFromRole(user.role);
  const organizationId = resolveOrganizationIdForUser(user, accountType);
  const { subscriptionPlan, entitlements } = await resolveSubscriptionContext(organizationId);
  const permissions = await resolvePermissions(user, accountType);

  return {
    id: user._id.toString(),
    role: resolveRoleForToken(user, accountType),
    companyId: organizationId,
    tokenVersion: user.tokenVersion ?? 0,
    sessionId: options.sessionId || crypto.randomUUID(),
    entitlements,
    subscriptionPlan,
    permissions,
  };
}

async function buildUserSubscriptionFields(user, options = {}) {
  const accountType = options.accountType || getAccountTypeFromRole(user.role);
  const tokenInput = await buildAccessTokenInput(user, options);

  return {
    entitlements: tokenInput.entitlements,
    subscriptionPlan: tokenInput.subscriptionPlan,
    tokenInput,
    accountType,
  };
}

module.exports = {
  buildAccessTokenInput,
  buildUserSubscriptionFields,
  resolveOrganizationIdForUser,
  resolveSubscriptionContext,
};
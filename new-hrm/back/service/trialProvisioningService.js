const mongoose = require("mongoose");
const Company = require("../models/personalOffice/companyModel.js");
const { callSubscription } = require("./billingClient.js");
const { recordAuditEvent } = require("./auditService.js");

const DEFAULT_TRIAL_PLAN_CODE = "starter";

function resolveTrialPlanCode() {
  return process.env.TRIAL_PLAN_CODE || DEFAULT_TRIAL_PLAN_CODE;
}

function isTrialProvisioningEnabled() {
  const flag = process.env.TRIAL_PROVISIONING_ENABLED;
  if (flag === "false" || flag === "0") {
    return false;
  }
  return true;
}

async function provisionTrialSubscription(organizationId, options = {}) {
  if (!organizationId) {
    throw new Error("organizationId is required for trial provisioning");
  }

  if (!isTrialProvisioningEnabled()) {
    return { skipped: true, reason: "TRIAL_PROVISIONING_DISABLED" };
  }

  const planCode = options.planCode || resolveTrialPlanCode();
  const response = await callSubscription("/v1/subscriptions", {
    method: "POST",
    body: {
      organizationId: String(organizationId),
      planCode,
    },
    idempotent: true,
    organizationId: String(organizationId),
    operation: "trial-create",
    correlationId: options.correlationId,
  });

  if (response.status === 409) {
    return {
      skipped: true,
      reason: "SUBSCRIPTION_ALREADY_EXISTS",
      status: response.status,
      data: response.data,
    };
  }

  if (!response.ok) {
    const error = new Error("Trial subscription provisioning failed");
    error.status = response.status;
    error.data = response.data;
    throw error;
  }

  const subscription = response.data?.data ?? response.data;

  if (mongoose.connection.readyState === 1) {
    await Company.findByIdAndUpdate(organizationId, {
      planCode,
      status: "ACTIVE",
      metadata: {
        trialProvisionedAt: new Date().toISOString(),
        subscriptionPublicId: subscription?.publicId ?? null,
      },
    });
  }

  await recordAuditEvent({
    actorId: options.actorId ?? null,
    actorRole: options.actorRole ?? "system",
    companyId: String(organizationId),
    action: "billing.trial.provisioned",
    resourceType: "Subscription",
    resourceId: subscription?._id ? String(subscription._id) : subscription?.publicId ?? null,
    metadata: {
      planCode,
      subscriptionStatus: subscription?.status ?? "TRIAL",
    },
    correlationId: options.correlationId ?? null,
  });

  return {
    provisioned: true,
    planCode,
    subscription,
  };
}

module.exports = {
  DEFAULT_TRIAL_PLAN_CODE,
  isTrialProvisioningEnabled,
  provisionTrialSubscription,
  resolveTrialPlanCode,
};
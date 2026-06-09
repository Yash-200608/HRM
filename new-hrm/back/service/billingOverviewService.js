const mongoose = require("mongoose");
const SubscriptionSnapshot = require("../models/billing/subscriptionSnapshotModel.js");
const InvoiceSnapshot = require("../models/billing/invoiceSnapshotModel.js");
const Company = require("../models/personalOffice/companyModel.js");
const { callSubscription, buildIdempotencyKey } = require("./billingClient.js");
const { recordAuditEvent } = require("./auditService.js");
const { provisionTrialSubscription } = require("./trialProvisioningService.js");
const { resolveSubscriptionContext } = require("./tokenClaimsService.js");

async function getLocalSubscription(organizationId) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  return SubscriptionSnapshot.findOne({ organization: organizationId }).lean();
}

async function resolveSubscriptionForOrganization(organizationId, options = {}) {
  let subscription = await getLocalSubscription(organizationId);
  if (subscription?._id) {
    return subscription;
  }

  const provisioned = await provisionTrialSubscription(organizationId, {
    actorId: options.actorId ?? null,
    actorRole: options.actorRole ?? "system",
    correlationId: options.correlationId,
  });

  if (provisioned.provisioned && provisioned.subscription?._id) {
    return provisioned.subscription;
  }

  subscription = await getLocalSubscription(organizationId);
  if (subscription?._id) {
    return subscription;
  }

  return null;
}

async function getLocalInvoices(organizationId, limit = 20) {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  return InvoiceSnapshot.find({ organization: organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getBillingOverview(organizationId, options = {}) {
  const company = await Company.findById(organizationId)
    .select("name planCode status metadata archivedAt suspendedAt")
    .lean();

  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  const [subscription, invoices, plansResponse, usageResponse] = await Promise.all([
    getLocalSubscription(organizationId),
    getLocalInvoices(organizationId),
    callSubscription("/v1/plans", {
      correlationId: options.correlationId,
    }),
    callSubscription(`/v1/usage/${organizationId}`, {
      correlationId: options.correlationId,
    }),
  ]);

  const plans = plansResponse.ok ? plansResponse.data?.data ?? plansResponse.data ?? [] : [];
  const usage = usageResponse.ok ? usageResponse.data?.data ?? usageResponse.data ?? null : null;
  const subscriptionContext = await resolveSubscriptionContext(organizationId);

  return {
    company: {
      id: String(company._id),
      name: company.name,
      planCode: company.planCode,
      status: company.status,
      metadata: company.metadata ?? {},
      archivedAt: company.archivedAt,
      suspendedAt: company.suspendedAt,
    },
    subscription,
    usage,
    entitlements: subscriptionContext.entitlements,
    subscriptionPlan: subscriptionContext.subscriptionPlan,
    plans: Array.isArray(plans) ? plans : [],
    invoices: invoices.map((invoice) => ({
      id: String(invoice._id),
      publicId: invoice.publicId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      amountDue: invoice.amountDue ?? invoice.total ?? 0,
      currency: invoice.currency || "INR",
      providerOrderId: invoice.providerOrderId ?? null,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
    })),
    upstream: {
      plansAvailable: plansResponse.ok,
      usageAvailable: usageResponse.ok,
    },
  };
}

async function upgradeSubscription(organizationId, planCode, options = {}) {
  const subscription = await resolveSubscriptionForOrganization(organizationId, options);
  if (!subscription?._id) {
    const error = new Error("Subscription not found for organization");
    error.status = 404;
    throw error;
  }

  const response = await callSubscription(`/v1/subscriptions/${subscription._id}/upgrade`, {
    method: "PATCH",
    body: { planCode },
    idempotent: true,
    organizationId: String(organizationId),
    operation: `upgrade:${planCode}`,
    correlationId: options.correlationId,
    idempotencyKey:
      options.idempotencyKey ||
      buildIdempotencyKey(String(organizationId), `upgrade:${planCode}`, { planCode }),
  });

  if (!response.ok) {
    const error = new Error("Subscription upgrade failed");
    error.status = response.status;
    error.data = response.data;
    throw error;
  }

  const upgraded = response.data?.data ?? response.data;

  await Company.findByIdAndUpdate(organizationId, {
    planCode,
    metadata: {
      lastUpgradeAt: new Date().toISOString(),
      lastUpgradePlanCode: planCode,
    },
  });

  await recordAuditEvent({
    actorId: options.actorId ?? null,
    actorRole: options.actorRole ?? "admin",
    companyId: String(organizationId),
    action: "billing.subscription.upgraded",
    resourceType: "Subscription",
    resourceId: String(subscription._id),
    metadata: {
      planCode,
      subscriptionPublicId: upgraded?.publicId ?? null,
    },
    correlationId: options.correlationId ?? null,
  });

  return upgraded;
}

async function getPlatformOpsMetrics(options = {}) {
  const response = await callSubscription("/v1/admin/ops/metrics", {
    correlationId: options.correlationId,
  });

  return {
    metrics: response.ok ? response.data?.data ?? response.data ?? null : null,
    upstream: {
      available: response.ok,
      status: response.status,
    },
  };
}

async function getPlatformMetrics(options = {}) {
  const [metricsResponse, revenueResponse] = await Promise.all([
    callSubscription("/v1/admin/metrics", { correlationId: options.correlationId }),
    callSubscription("/v1/admin/revenue", { correlationId: options.correlationId }),
  ]);

  return {
    metrics: metricsResponse.ok ? metricsResponse.data?.data ?? metricsResponse.data ?? null : null,
    revenue: revenueResponse.ok ? revenueResponse.data?.data ?? revenueResponse.data ?? null : null,
    upstream: {
      metricsAvailable: metricsResponse.ok,
      revenueAvailable: revenueResponse.ok,
      metricsStatus: metricsResponse.status,
      revenueStatus: revenueResponse.status,
    },
  };
}

module.exports = {
  getBillingOverview,
  getPlatformMetrics,
  getPlatformOpsMetrics,
  upgradeSubscription,
};
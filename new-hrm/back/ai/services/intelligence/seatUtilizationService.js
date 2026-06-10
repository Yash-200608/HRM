const SubscriptionSnapshot = require("../../../models/billing/subscriptionSnapshotModel.js");
const InvoiceSnapshot = require("../../../models/billing/invoiceSnapshotModel.js");
const { assertOrganizationId, sanitizeToolArgs } = require("../../../service/hrAnalyticsReadService.js");
const { countActiveEmployees } = require("../../../service/employeeLimitService.js");
const { callSubscription } = require("../../../service/billingClient.js");
const { percentChange } = require("./predictiveUtils.js");

const CHURN_STATUSES = new Set(["READ_ONLY", "SUSPENDED", "CANCELLED", "CANCELING", "PAST_DUE"]);
const UPGRADE_THRESHOLD = Number(process.env.AI_SEAT_UPGRADE_THRESHOLD || 85);

function buildUpgradeRecommendation(utilizationPercent, activeCount, seatLimit) {
  if (seatLimit == null) {
    return {
      type: "unlimited_plan",
      message: "Current plan has no configured employee seat limit.",
    };
  }

  if (utilizationPercent >= 95) {
    return {
      type: "urgent_upgrade",
      message: `Seat utilization is ${utilizationPercent}%. Upgrade immediately to avoid provisioning blocks.`,
      suggestedAction: "Upgrade plan or add seats before adding employees.",
    };
  }

  if (utilizationPercent >= UPGRADE_THRESHOLD) {
    return {
      type: "upgrade_recommended",
      message: `Seat utilization is ${utilizationPercent}%. Consider upgrading before the next hiring cycle.`,
      suggestedAction: "Review growth plan and upgrade options.",
    };
  }

  if (utilizationPercent < 50 && seatLimit >= 25) {
    return {
      type: "downsize_review",
      message: `Only ${utilizationPercent}% of purchased seats are used.`,
      suggestedAction: "Review whether a smaller plan could reduce subscription cost.",
    };
  }

  return {
    type: "healthy_utilization",
    message: `Seat utilization is ${utilizationPercent}% with ${activeCount} active employees.`,
    suggestedAction: "No immediate seat change required.",
  };
}

function assessChurnRisk(subscription, unpaidInvoices) {
  const factors = [];
  let score = 0;

  if (!subscription) {
    return { score: 40, level: "medium", factors: ["No subscription snapshot found"] };
  }

  if (CHURN_STATUSES.has(String(subscription.status || "").toUpperCase())) {
    score += 50;
    factors.push(`Subscription status is ${subscription.status}`);
  }

  if (subscription.trialEndsAt && new Date(subscription.trialEndsAt).getTime() < Date.now()) {
    score += 20;
    factors.push("Trial period has ended");
  }

  if (unpaidInvoices.length > 0) {
    score += 25;
    factors.push(`${unpaidInvoices.length} unpaid invoice(s)`);
  }

  const level = score >= 60 ? "high" : score >= 35 ? "medium" : "low";
  return { score: Math.min(100, score), level, factors };
}

async function getSeatUtilizationAnalysis(organizationId, rawArgs = {}) {
  const orgId = assertOrganizationId(organizationId);
  sanitizeToolArgs(rawArgs);

  const [activeCount, subscription, invoices, usageResponse] = await Promise.all([
    countActiveEmployees(orgId),
    SubscriptionSnapshot.findOne({ organization: orgId }).lean(),
    InvoiceSnapshot.find({ organization: orgId }).sort({ createdAt: -1 }).limit(12).lean(),
    callSubscription(`/v1/usage/${orgId}`, {
      organizationId: orgId,
      operation: "ai-seat-utilization",
      idempotent: true,
    }).catch(() => ({ ok: false, data: null })),
  ]);

  const seatLimit = subscription?.employeeLimit ?? null;
  const utilizationPercent =
    seatLimit != null && seatLimit > 0
      ? Math.round((activeCount / seatLimit) * 1000) / 10
      : null;

  const unpaidInvoices = invoices.filter((invoice) =>
    ["open", "past_due", "uncollectible", "pending"].includes(
      String(invoice.status || "").toLowerCase()
    )
  );

  const paidTotals = invoices
    .filter((invoice) => String(invoice.status || "").toLowerCase() === "paid")
    .map((invoice) => Number(invoice.total) || 0);
  const latestInvoice = invoices[0];
  const billingAnomalies = [];

  if (unpaidInvoices.length) {
    billingAnomalies.push({
      type: "unpaid_invoices",
      severity: "high",
      message: `${unpaidInvoices.length} unpaid invoice(s) detected`,
      count: unpaidInvoices.length,
    });
  }

  if (paidTotals.length >= 2 && latestInvoice) {
    const previousAverage =
      paidTotals.slice(1).reduce((sum, value) => sum + value, 0) / (paidTotals.length - 1);
    const latestTotal = Number(latestInvoice.total) || 0;
    const change = percentChange(latestTotal, previousAverage);
    if (Math.abs(change) >= 35) {
      billingAnomalies.push({
        type: "invoice_total_swing",
        severity: "medium",
        message: `Latest invoice total changed ${change}% versus recent average`,
        latestTotal,
        recentAverage: Math.round(previousAverage * 100) / 100,
        percentChange: change,
      });
    }
  }

  const usage = usageResponse.ok ? usageResponse.data?.data ?? usageResponse.data : null;
  const churnRisk = assessChurnRisk(subscription, unpaidInvoices);

  return {
    seats: {
      activeEmployees: activeCount,
      seatLimit,
      utilizationPercent,
      availableSeats: seatLimit != null ? Math.max(seatLimit - activeCount, 0) : null,
      overageEmployees: usage?.overageEmployees ?? (seatLimit != null ? Math.max(activeCount - seatLimit, 0) : 0),
    },
    subscription: subscription
      ? {
          planCode: subscription.planCode,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
        }
      : null,
    churnRisk,
    billingAnomalies,
    upgradeRecommendation: buildUpgradeRecommendation(
      utilizationPercent ?? 0,
      activeCount,
      seatLimit
    ),
    usageSync: usage
      ? {
          lastSyncedAt: usage.lastSyncedAt || null,
          archivedEmployees: usage.archivedEmployees ?? null,
        }
      : null,
    methodology:
      "Combines active employee count, subscription seat limits, invoice health, and subscription status to assess utilization and churn signals.",
  };
}

module.exports = {
  assessChurnRisk,
  buildUpgradeRecommendation,
  getSeatUtilizationAnalysis,
};
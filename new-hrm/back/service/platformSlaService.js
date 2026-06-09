const mongoose = require("mongoose");
const AuditEvent = require("../models/personalOffice/auditEventModel.js");
const OAuthSecurityEvent = require("../models/oauthSecurityEventModel.js");
const Company = require("../models/personalOffice/companyModel.js");
const { Employee } = require("../models/personalOffice/employeeModel.js");
const { callSubscription } = require("./billingClient.js");
const { getPlatformOpsMetrics } = require("./billingOverviewService.js");
const { matchRunbooksForIndicators } = require("./incidentRunbookService.js");

const DEFAULT_SLA_TARGETS = {
  apiAvailabilityPercent: Number(process.env.SLA_API_AVAILABILITY_PERCENT || 99.9),
  billingProxyAvailabilityPercent: Number(process.env.SLA_BILLING_PROXY_PERCENT || 99.5),
  entitlementDeniesPerHour: Number(process.env.SLA_ENTITLEMENT_DENIES_PER_HOUR || 25),
  oauthFailuresPerHour: Number(process.env.SLA_OAUTH_FAILURES_PER_HOUR || 10),
  employeeUsageDriftPercent: Number(process.env.SLA_EMPLOYEE_USAGE_DRIFT_PERCENT || 1),
  outboxLagMinutes: Number(process.env.SLA_OUTBOX_LAG_MINUTES || 10),
};

const HRM_START_TIME = Date.now();

function resolveIndicatorStatus(value, { warning, critical, higherIsWorse = true }) {
  if (value == null || Number.isNaN(value)) {
    return "unknown";
  }

  if (higherIsWorse) {
    if (value >= critical) return "critical";
    if (value >= warning) return "warning";
    return "healthy";
  }

  if (value <= critical) return "critical";
  if (value <= warning) return "warning";
  return "healthy";
}

function resolveOverallStatus(indicators) {
  if (indicators.some((indicator) => indicator.status === "critical")) {
    return "critical";
  }
  if (indicators.some((indicator) => indicator.status === "warning")) {
    return "warning";
  }
  if (indicators.some((indicator) => indicator.status === "unknown")) {
    return "warning";
  }
  return "healthy";
}

async function countAuditActionsSince(actions, since) {
  if (mongoose.connection.readyState !== 1) {
    return 0;
  }

  return AuditEvent.countDocuments({
    action: { $in: actions },
    createdAt: { $gte: since },
  });
}

async function countOAuthFailuresSince(since) {
  if (mongoose.connection.readyState !== 1) {
    return 0;
  }

  return OAuthSecurityEvent.countDocuments({
    createdAt: { $gte: since },
    eventType: { $in: ["login_failed", "link_failed", "tenant_mismatch", "nonce_mismatch"] },
  });
}

async function sampleEmployeeUsageDrift() {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const companies = await Company.find({ status: "ACTIVE" })
    .select("_id name")
    .limit(5)
    .lean();

  if (companies.length === 0) {
    return { sampledOrganizations: 0, maxDriftPercent: 0, averageDriftPercent: 0 };
  }

  const drifts = [];
  for (const company of companies) {
    const activeEmployees = await Employee.countDocuments({
      createdBy: company._id,
      status: "ACTIVE",
    });

    const usageResponse = await callSubscription(`/v1/usage/${company._id}`);
    const usageCount =
      usageResponse.ok
        ? Number(
            usageResponse.data?.data?.activeEmployees ??
              usageResponse.data?.activeEmployees ??
              activeEmployees
          )
        : activeEmployees;

    const baseline = Math.max(activeEmployees, 1);
    const driftPercent = Math.abs(activeEmployees - usageCount) / baseline * 100;
    drifts.push(driftPercent);
  }

  const maxDriftPercent = Math.max(...drifts, 0);
  const averageDriftPercent = drifts.reduce((sum, value) => sum + value, 0) / drifts.length;

  return {
    sampledOrganizations: companies.length,
    maxDriftPercent: Number(maxDriftPercent.toFixed(2)),
    averageDriftPercent: Number(averageDriftPercent.toFixed(2)),
  };
}

async function getSlaDashboard(options = {}) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    entitlementDenies24h,
    entitlementDenies1h,
    outboxFailures24h,
    readOnlyDenies24h,
    oauthFailures24h,
    oauthFailures1h,
    archivedCompanies,
    subscriptionHealth,
    subscriptionOps,
    usageDrift,
  ] = await Promise.all([
    countAuditActionsSince(["ENTITLEMENT_DENIED"], since),
    countAuditActionsSince(["ENTITLEMENT_DENIED"], oneHourAgo),
    countAuditActionsSince(["platform.outbox.consume_failed"], since),
    countAuditActionsSince(["TENANT_READ_ONLY_DENIED"], since),
    countOAuthFailuresSince(since),
    countOAuthFailuresSince(oneHourAgo),
    Company.countDocuments({ status: "ARCHIVED" }),
    callSubscription("/health"),
    getPlatformOpsMetrics({ correlationId: options.correlationId }),
    sampleEmployeeUsageDrift(),
  ]);

  const mongoConnected = mongoose.connection.readyState === 1;
  const uptimeSeconds = Math.floor((Date.now() - HRM_START_TIME) / 1000);
  const billingProxyHealthy = subscriptionHealth.ok;

  const indicators = [
    {
      key: "hrm_database",
      label: "HRM database",
      value: mongoConnected ? 100 : 0,
      unit: "percent",
      target: DEFAULT_SLA_TARGETS.apiAvailabilityPercent,
      status: mongoConnected ? "healthy" : "critical",
    },
    {
      key: "billing_proxy",
      label: "Billing proxy / Subscription health",
      value: billingProxyHealthy ? 100 : 0,
      unit: "percent",
      target: DEFAULT_SLA_TARGETS.billingProxyAvailabilityPercent,
      status: billingProxyHealthy ? "healthy" : "critical",
    },
    {
      key: "entitlement_denies",
      label: "Entitlement denials (1h)",
      value: entitlementDenies1h,
      unit: "count",
      target: DEFAULT_SLA_TARGETS.entitlementDeniesPerHour,
      status: resolveIndicatorStatus(entitlementDenies1h, {
        warning: DEFAULT_SLA_TARGETS.entitlementDeniesPerHour,
        critical: DEFAULT_SLA_TARGETS.entitlementDeniesPerHour * 2,
      }),
    },
    {
      key: "oauth_failures",
      label: "OAuth failures (1h)",
      value: oauthFailures1h,
      unit: "count",
      target: DEFAULT_SLA_TARGETS.oauthFailuresPerHour,
      status: resolveIndicatorStatus(oauthFailures1h, {
        warning: DEFAULT_SLA_TARGETS.oauthFailuresPerHour,
        critical: DEFAULT_SLA_TARGETS.oauthFailuresPerHour * 2,
      }),
    },
    {
      key: "outbox_consume",
      label: "Outbox consume failures (24h)",
      value: outboxFailures24h,
      unit: "count",
      target: 0,
      status: resolveIndicatorStatus(outboxFailures24h, {
        warning: 1,
        critical: 5,
      }),
    },
    {
      key: "employee_usage_drift",
      label: "Employee usage drift (sample)",
      value: usageDrift?.maxDriftPercent ?? null,
      unit: "percent",
      target: DEFAULT_SLA_TARGETS.employeeUsageDriftPercent,
      status: resolveIndicatorStatus(usageDrift?.maxDriftPercent ?? 0, {
        warning: DEFAULT_SLA_TARGETS.employeeUsageDriftPercent,
        critical: DEFAULT_SLA_TARGETS.employeeUsageDriftPercent * 3,
      }),
    },
  ];

  const overallStatus = resolveOverallStatus(indicators);
  const recommendedRunbookIds = matchRunbooksForIndicators(indicators);

  return {
    generatedAt: new Date().toISOString(),
    overallStatus,
    uptimeSeconds,
    slaTargets: DEFAULT_SLA_TARGETS,
    indicators,
    signals: {
      entitlementDenies24h,
      oauthFailures24h,
      outboxFailures24h,
      readOnlyDenies24h,
      archivedCompanies,
      usageDrift,
    },
    subscriptionOps,
    recommendedRunbookIds,
    services: [
      {
        name: "hrm-api",
        status: mongoConnected ? "healthy" : "critical",
        details: { mongoConnected, uptimeSeconds },
      },
      {
        name: "subscription",
        status: billingProxyHealthy ? "healthy" : "critical",
        details: { healthStatus: subscriptionHealth.status },
      },
      {
        name: "outbox-consumer",
        status: outboxFailures24h > 0 ? "warning" : "healthy",
        details: {
          configured: Boolean(process.env.OUTBOX_DELIVERY_SECRET),
          failures24h: outboxFailures24h,
        },
      },
    ],
  };
}

module.exports = {
  DEFAULT_SLA_TARGETS,
  getSlaDashboard,
  resolveIndicatorStatus,
  resolveOverallStatus,
};
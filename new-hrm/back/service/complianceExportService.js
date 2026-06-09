const mongoose = require("mongoose");
const AuditEvent = require("../models/personalOffice/auditEventModel.js");
const Company = require("../models/personalOffice/companyModel.js");
const SubscriptionSnapshot = require("../models/billing/subscriptionSnapshotModel.js");
const InvoiceSnapshot = require("../models/billing/invoiceSnapshotModel.js");
const { Employee } = require("../models/personalOffice/employeeModel.js");
const { callSubscription } = require("./billingClient.js");
const { resolveTenantContext } = require("./tenantContextService.js");
const { recordAuditEvent } = require("./auditService.js");

const DEFAULT_AUDIT_LIMIT = Number(process.env.COMPLIANCE_AUDIT_LIMIT || 5000);

async function countActiveEmployees(organizationId) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  return Employee.countDocuments({
    createdBy: organizationId,
    isActive: { $ne: false },
  });
}

async function buildComplianceExport(organizationId, options = {}) {
  if (!organizationId) {
    const error = new Error("organizationId is required");
    error.status = 400;
    throw error;
  }

  const [company, subscription, invoices, auditEvents, employeeCount, tenantContext, usageResponse] =
    await Promise.all([
      Company.findById(organizationId)
        .select("name email status planCode metadata archivedAt suspendedAt createdAt updatedAt")
        .lean(),
      SubscriptionSnapshot.findOne({ organization: organizationId }).lean(),
      InvoiceSnapshot.find({ organization: organizationId }).sort({ createdAt: -1 }).limit(100).lean(),
      mongoose.connection.readyState === 1
        ? AuditEvent.find({ companyId: String(organizationId) })
            .sort({ createdAt: -1 })
            .limit(DEFAULT_AUDIT_LIMIT)
            .lean()
        : [],
      countActiveEmployees(organizationId),
      resolveTenantContext(organizationId),
      callSubscription(`/v1/usage/${organizationId}`, {
        correlationId: options.correlationId,
      }),
    ]);

  if (!company) {
    const error = new Error("Organization not found");
    error.status = 404;
    throw error;
  }

  const usage = usageResponse.ok ? usageResponse.data?.data ?? usageResponse.data ?? null : null;

  const exportPayload = {
    schemaVersion: "compliance-export-v1",
    generatedAt: new Date().toISOString(),
    organizationId: String(organizationId),
    requestedBy: {
      actorId: options.actorId || null,
      actorRole: options.actorRole || null,
    },
    tenant: {
      company,
      subscription,
      tenantContext,
      activeEmployees: employeeCount,
      usage,
    },
    billing: {
      invoices,
    },
    audit: {
      eventCount: auditEvents.length,
      truncated: auditEvents.length >= DEFAULT_AUDIT_LIMIT,
      events: auditEvents,
    },
  };

  await recordAuditEvent({
    actorId: options.actorId || null,
    actorRole: options.actorRole || null,
    companyId: String(organizationId),
    action: "compliance.export.generated",
    resourceType: "ComplianceExport",
    resourceId: String(organizationId),
    metadata: {
      auditEventCount: auditEvents.length,
      invoiceCount: invoices.length,
    },
    correlationId: options.correlationId || null,
  });

  return exportPayload;
}

module.exports = {
  DEFAULT_AUDIT_LIMIT,
  buildComplianceExport,
};
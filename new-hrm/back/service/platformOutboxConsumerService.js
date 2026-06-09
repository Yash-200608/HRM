const crypto = require("crypto");
const mongoose = require("mongoose");
const Company = require("../models/personalOffice/companyModel.js");
const { Admin } = require("../models/personalOffice/authModel.js");
const Notification = require("../models/personalOffice/NotificationModel.js");
const PlatformOutboxReceipt = require("../models/billing/platformOutboxReceiptModel.js");
const { recordAuditEvent } = require("./auditService.js");

const SUPPORTED_TOPICS = new Set([
  "organization.archived",
  "subscription.upgraded",
  "subscription.downgraded",
  "invoice.paid",
  "subscription.expired",
]);

function verifyOutboxSignature(rawBody, signature) {
  const secret = process.env.OUTBOX_DELIVERY_SECRET;
  if (!secret) {
    throw new Error("OUTBOX_DELIVERY_SECRET is not configured");
  }

  if (!signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = Buffer.from(String(signature), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (provided.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expectedBuffer);
}

async function hasProcessedEvent(eventId) {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  const existing = await PlatformOutboxReceipt.findOne({ eventId }).lean();
  return Boolean(existing);
}

async function markEventProcessed(event, result = "processed") {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  return PlatformOutboxReceipt.create({
    eventId: event.eventId,
    topic: event.topic,
    organizationId: event.organizationId ? String(event.organizationId) : null,
    result,
  });
}

async function notifyCompanyAdmins(organizationId, message, options = {}) {
  if (mongoose.connection.readyState !== 1 || !organizationId) {
    return [];
  }

  const admins = await Admin.find({ companyId: organizationId }).select("_id").lean();
  if (!admins.length) {
    return [];
  }

  const notifications = admins.map((admin) => ({
    companyId: organizationId,
    userId: admin._id,
    userModel: "Admin",
    type: "billing",
    message,
    actionUrl: options.actionUrl || "/billing",
    status: "unread",
    priority: options.priority || "medium",
    isSystem: true,
    createdBy: admin._id,
  }));

  return Notification.insertMany(notifications);
}

async function handleOrganizationArchived(event) {
  const organizationId = event.organizationId || event.payload?.organizationId;
  if (!organizationId) {
    return { ignored: true, reason: "missing_organization_id" };
  }

  await Company.findByIdAndUpdate(organizationId, {
    status: "ARCHIVED",
    archivedAt: event.payload?.archivedAt ? new Date(event.payload.archivedAt) : new Date(),
  });

  await notifyCompanyAdmins(
    organizationId,
    "Your organization has been archived. Write access is now disabled.",
    { priority: "high", actionUrl: "/billing" }
  );

  return { organizationId, status: "ARCHIVED" };
}

async function handleSubscriptionPlanChange(event, changeType) {
  const organizationId = event.organizationId;
  const toPlanCode = event.payload?.toPlanCode;

  if (!organizationId || !toPlanCode) {
    return { ignored: true, reason: "missing_plan_change_fields" };
  }

  await Company.findByIdAndUpdate(organizationId, {
    planCode: toPlanCode,
    status: "ACTIVE",
    metadata: {
      lastPlanChangeAt: new Date().toISOString(),
      lastPlanChangeType: changeType,
      fromPlanCode: event.payload?.fromPlanCode ?? null,
    },
  });

  const verb = changeType === "UPGRADE" ? "upgraded" : "downgraded";
  await notifyCompanyAdmins(
    organizationId,
    `Your subscription was ${verb} to the ${toPlanCode} plan.`,
    { priority: "medium" }
  );

  return { organizationId, planCode: toPlanCode, changeType };
}

async function handleInvoicePaid(event) {
  const organizationId = event.organizationId;
  if (!organizationId) {
    return { ignored: true, reason: "missing_organization_id" };
  }

  const total = event.payload?.total;
  const publicId = event.payload?.publicId || event.payload?.invoiceId;
  const amountText = typeof total === "number" ? ` (${event.payload?.currency || "INR"} ${total})` : "";

  await notifyCompanyAdmins(
    organizationId,
    `Invoice ${publicId || ""} was paid successfully${amountText}.`.trim(),
    { priority: "low" }
  );

  return { organizationId, invoiceId: event.payload?.invoiceId ?? null };
}

async function handleSubscriptionExpired(event) {
  const organizationId = event.organizationId;
  const planCode = event.payload?.planCode || "free";

  if (!organizationId) {
    return { ignored: true, reason: "missing_organization_id" };
  }

  await Company.findByIdAndUpdate(organizationId, {
    planCode,
    status: "ACTIVE",
    metadata: {
      trialExpiredAt: new Date().toISOString(),
      subscriptionStatus: event.payload?.status ?? "ACTIVE",
    },
  });

  await notifyCompanyAdmins(
    organizationId,
    "Your trial has ended. Your account has moved to the free plan.",
    { priority: "high" }
  );

  return { organizationId, planCode };
}

async function dispatchOutboxEvent(event) {
  switch (event.topic) {
    case "organization.archived":
      return handleOrganizationArchived(event);
    case "subscription.upgraded":
      return handleSubscriptionPlanChange(event, "UPGRADE");
    case "subscription.downgraded":
      return handleSubscriptionPlanChange(event, "DOWNGRADE");
    case "invoice.paid":
      return handleInvoicePaid(event);
    case "subscription.expired":
      return handleSubscriptionExpired(event);
    default:
      return { ignored: true, reason: "unsupported_topic" };
  }
}

async function consumePlatformOutboxEvent(rawBody, headers = {}) {
  let event;
  try {
    event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch {
    const error = new Error("Invalid outbox payload");
    error.status = 400;
    throw error;
  }

  if (!event?.eventId || !event?.topic) {
    const error = new Error("Outbox eventId and topic are required");
    error.status = 400;
    throw error;
  }

  const signature = headers["x-outbox-signature"] || headers["X-Outbox-Signature"];
  const serializedBody = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  if (!verifyOutboxSignature(serializedBody, signature)) {
    const error = new Error("Invalid outbox signature");
    error.status = 401;
    throw error;
  }

  if (await hasProcessedEvent(event.eventId)) {
    return {
      duplicate: true,
      eventId: event.eventId,
      topic: event.topic,
    };
  }

  if (!SUPPORTED_TOPICS.has(event.topic)) {
    await markEventProcessed(event, "ignored");
    return {
      ignored: true,
      eventId: event.eventId,
      topic: event.topic,
    };
  }

  const result = await dispatchOutboxEvent(event);

  await markEventProcessed(event, result?.ignored ? "ignored" : "processed");

  await recordAuditEvent({
    actorRole: "system",
    companyId: event.organizationId ? String(event.organizationId) : null,
    action: "platform.outbox.consumed",
    resourceType: "OutboxEvent",
    resourceId: event.eventId,
    metadata: {
      topic: event.topic,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      result,
    },
    correlationId: event.eventId,
  });

  return {
    processed: true,
    eventId: event.eventId,
    topic: event.topic,
    result,
  };
}

module.exports = {
  SUPPORTED_TOPICS,
  consumePlatformOutboxEvent,
  verifyOutboxSignature,
};
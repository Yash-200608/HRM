const mongoose = require("mongoose");
const { callSubscription } = require("./billingClient.js");

const HRM_EMPLOYEE_EVENT_TYPES = new Set([
  "EmployeeCreated",
  "EmployeeDeleted",
  "EmployeeArchived",
  "EmployeeRestored",
]);

const HRM_ARCHIVED_STATUSES = new Set(["RELIEVED", "ON_HOLD"]);

const eventInboxSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    source: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    eventVersion: { type: Number, default: null, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ["RECEIVED", "PROCESSING", "PROCESSED", "FAILED", "DUPLICATE"],
      default: "RECEIVED",
      index: true,
    },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    claimedAt: { type: Date, default: null },
    claimedBy: { type: String, default: null },
    claimExpiresAt: { type: Date, default: null, index: true },
    lastAttemptAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null, index: true },
    failureReason: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: "eventinboxes" }
);

eventInboxSchema.index({ organizationId: 1, eventId: 1 }, { unique: true });
eventInboxSchema.index({ source: 1, topic: 1, organizationId: 1 });

const EventInbox =
  mongoose.models.EventInbox ||
  mongoose.model("EventInbox", eventInboxSchema, "eventinboxes");

function normalizeId(value) {
  if (!value) return null;
  if (value._id) return String(value._id);
  return String(value);
}

function eventVersionFrom(employee, fallbackDate = new Date()) {
  const sourceDate = employee?.updatedAt || employee?.createdAt || fallbackDate;
  const timestamp = new Date(sourceDate).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallbackDate.getTime();
}

function mapEmployeeStatusTransition(previousStatus, nextStatus) {
  if (!previousStatus || !nextStatus || previousStatus === nextStatus) {
    return null;
  }

  if (previousStatus === "ACTIVE" && HRM_ARCHIVED_STATUSES.has(nextStatus)) {
    return "EmployeeArchived";
  }

  if (HRM_ARCHIVED_STATUSES.has(previousStatus) && nextStatus === "ACTIVE") {
    return "EmployeeRestored";
  }

  return null;
}

function buildEmployeeLifecycleEventId(eventType, entityId, eventVersion) {
  if (eventType === "EmployeeCreated") {
    return `hrm.employee.${entityId}.created`;
  }

  if (eventType === "EmployeeDeleted") {
    return `hrm.employee.${entityId}.deleted`;
  }

  return `hrm.employee.${entityId}.${eventType}.${eventVersion}`;
}

const HTTP_EMIT_MAX_ATTEMPTS = 3;
const HTTP_EMIT_RETRY_BASE_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function emitEmployeeLifecycleEventHttp(eventRecord) {
  if (!eventRecord) {
    return { delivered: false, via: "skipped" };
  }

  if (process.env.EMPLOYEE_EVENT_HTTP_EMIT_ENABLED === "false") {
    return { delivered: false, via: "disabled" };
  }

  const inboundPayload = {
    eventId: eventRecord.eventId,
    source: eventRecord.source || "hrm",
    topic: eventRecord.topic,
    organizationId: eventRecord.organizationId,
    payload: eventRecord.payload,
  };

  for (let attempt = 1; attempt <= HTTP_EMIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await callSubscription("/v1/events/inbound", {
        method: "POST",
        body: inboundPayload,
        organizationId: eventRecord.organizationId,
        operation: `event-inbound:${eventRecord.eventId}`,
        idempotent: true,
      });

      if (response.ok) {
        return {
          delivered: true,
          via: "http",
          deduped: Boolean(response.data?.deduped),
          attempt,
        };
      }
    } catch (error) {
      if (attempt === HTTP_EMIT_MAX_ATTEMPTS) {
        return {
          delivered: false,
          via: "db-fallback",
          attempt,
          error: error.message,
        };
      }
    }

    await sleep(HTTP_EMIT_RETRY_BASE_MS * attempt);
  }

  return { delivered: false, via: "db-fallback" };
}

async function publishEmployeeLifecycleEvent({
  eventType,
  employee,
  organizationId,
  eventVersion,
  occurredAt = new Date(),
  payload = {},
}) {
  if (!HRM_EMPLOYEE_EVENT_TYPES.has(eventType)) {
    throw new Error(`Unsupported employee lifecycle event type: ${eventType}`);
  }

  const entityId = normalizeId(employee);
  const normalizedOrganizationId = normalizeId(organizationId || employee?.createdBy);

  if (!entityId || !normalizedOrganizationId) {
    throw new Error("Employee lifecycle event requires employee and organization identifiers");
  }

  const normalizedEventVersion = Number(eventVersion || eventVersionFrom(employee, occurredAt));
  const eventId = buildEmployeeLifecycleEventId(eventType, entityId, normalizedEventVersion);
  const eventPayload = {
    eventId,
    eventType,
    organizationId: normalizedOrganizationId,
    entityId,
    eventVersion: normalizedEventVersion,
    payload: {
      ...payload,
      employeeStatus: employee?.status || null,
      occurredAt,
    },
  };

  const record = {
    eventId,
    source: "hrm",
    topic: eventType,
    organizationId: normalizedOrganizationId,
    entityId,
    eventVersion: normalizedEventVersion,
    payload: eventPayload,
    receivedAt: occurredAt,
    status: "RECEIVED",
  };

  let persistedRecord;

  try {
    persistedRecord = await EventInbox.findOneAndUpdate(
      { organizationId: normalizedOrganizationId, eventId },
      { $setOnInsert: record },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    if (error && error.code === 11000) {
      persistedRecord = await EventInbox.findOne({
        organizationId: normalizedOrganizationId,
        eventId,
      }).lean();
    } else {
      throw error;
    }
  }

  const httpDelivery = await emitEmployeeLifecycleEventHttp(persistedRecord);

  return {
    ...persistedRecord,
    delivery: httpDelivery,
  };
}

module.exports = {
  emitEmployeeLifecycleEventHttp,
  mapEmployeeStatusTransition,
  publishEmployeeLifecycleEvent,
};

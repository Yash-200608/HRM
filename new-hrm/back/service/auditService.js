const crypto = require("crypto");
const mongoose = require("mongoose");
const AuditEvent = require("../models/personalOffice/auditEventModel.js");

function buildContentHash(event) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        actorId: event.actorId ?? null,
        actorRole: event.actorRole ?? null,
        companyId: event.companyId ?? null,
        action: event.action,
        resourceType: event.resourceType ?? null,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata ?? {},
        correlationId: event.correlationId ?? null,
      })
    )
    .digest("hex");
}

async function recordAuditEvent(event) {
  if (!event?.action) {
    throw new Error("Audit event action is required");
  }

  const payload = {
    actorId: event.actorId ?? null,
    actorRole: event.actorRole ?? null,
    companyId: event.companyId ?? null,
    action: event.action,
    resourceType: event.resourceType ?? null,
    resourceId: event.resourceId ?? null,
    metadata: event.metadata ?? {},
    correlationId: event.correlationId ?? null,
    contentHash: buildContentHash(event),
  };

  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    return await AuditEvent.create(payload);
  } catch (error) {
    console.error("Failed to record audit event:", error.message);
    return null;
  }
}

module.exports = {
  buildContentHash,
  recordAuditEvent,
};
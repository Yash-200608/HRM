const crypto = require("crypto");
const mongoose = require("mongoose");
const AuditEvent = require("../models/personalOffice/auditEventModel.js");

function buildContentHash(event, chain = {}) {
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
        sequenceNumber: chain.sequenceNumber ?? null,
        previousHash: chain.previousHash ?? null,
      })
    )
    .digest("hex");
}

async function resolveAuditChainState() {
  const latest = await AuditEvent.findOne()
    .sort({ sequenceNumber: -1 })
    .select("sequenceNumber contentHash")
    .lean();

  if (!latest) {
    return { sequenceNumber: 1, previousHash: null };
  }

  return {
    sequenceNumber: Number(latest.sequenceNumber || 0) + 1,
    previousHash: latest.contentHash || null,
  };
}

async function verifyAuditChain(limit = 100) {
  const events = await AuditEvent.find()
    .sort({ sequenceNumber: 1 })
    .limit(limit)
    .lean();

  let expectedPreviousHash = null;

  for (const event of events) {
    const recomputed = buildContentHash(event, {
      sequenceNumber: event.sequenceNumber,
      previousHash: event.previousHash,
    });

    if (recomputed !== event.contentHash) {
      return {
        valid: false,
        brokenAtSequence: event.sequenceNumber,
        reason: "content_hash_mismatch",
      };
    }

    if (event.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        brokenAtSequence: event.sequenceNumber,
        reason: "previous_hash_mismatch",
      };
    }

    expectedPreviousHash = event.contentHash;
  }

  return { valid: true, checked: events.length };
}

async function recordAuditEvent(event) {
  if (!event?.action) {
    throw new Error("Audit event action is required");
  }

  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    const chain = await resolveAuditChainState();
    const payload = {
      actorId: event.actorId ?? null,
      actorRole: event.actorRole ?? null,
      companyId: event.companyId ?? null,
      action: event.action,
      resourceType: event.resourceType ?? null,
      resourceId: event.resourceId ?? null,
      metadata: event.metadata ?? {},
      correlationId: event.correlationId ?? null,
      sequenceNumber: chain.sequenceNumber,
      previousHash: chain.previousHash,
      contentHash: buildContentHash(event, chain),
    };

    return await AuditEvent.create(payload);
  } catch (error) {
    console.error("Failed to record audit event:", error.message);
    return null;
  }
}

module.exports = {
  buildContentHash,
  recordAuditEvent,
  resolveAuditChainState,
  verifyAuditChain,
};
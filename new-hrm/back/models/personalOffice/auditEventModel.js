const mongoose = require("mongoose");

const auditEventSchema = new mongoose.Schema(
  {
    actorId: { type: String, default: null, index: true },
    actorRole: { type: String, default: null },
    companyId: { type: String, default: null, index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, default: null, index: true },
    resourceId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    correlationId: { type: String, default: null, index: true },
    contentHash: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

auditEventSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditEvent", auditEventSchema, "audit_events");
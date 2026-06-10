const mongoose = require("mongoose");

const IMMUTABLE_ERROR = "Audit events are append-only and cannot be modified";

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
    sequenceNumber: { type: Number, required: true, index: true },
    previousHash: { type: String, default: null },
    contentHash: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

auditEventSchema.index({ companyId: 1, createdAt: -1 });

function blockMutation() {
  throw new Error(IMMUTABLE_ERROR);
}

[
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
].forEach((operation) => {
  auditEventSchema.pre(operation, { document: false, query: true }, blockMutation);
});

auditEventSchema.pre("save", function enforceImmutability() {
  if (!this.isNew) {
    throw new Error(IMMUTABLE_ERROR);
  }
});

module.exports = mongoose.model("AuditEvent", auditEventSchema, "audit_events");
module.exports.IMMUTABLE_ERROR = IMMUTABLE_ERROR;
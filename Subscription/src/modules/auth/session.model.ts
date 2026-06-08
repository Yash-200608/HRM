import { Schema, model } from 'mongoose';

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    operator: { type: Schema.Types.ObjectId, ref: 'Operator', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    kind: { type: String, required: true, enum: ['user', 'admin', 'service', 'organization'], index: true },
    roles: { type: [String], default: [] },
    tokenId: { type: String, required: true, unique: true, index: true },
    tokenVersion: { type: Number, required: true, default: 1, min: 1 },
    status: { type: String, required: true, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE', index: true },
    deviceInfo: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    lastSeenAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

sessionSchema.index({ operator: 1, status: 1 });
sessionSchema.index({ organization: 1, status: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model('Session', sessionSchema);

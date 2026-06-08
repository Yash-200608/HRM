import { Schema, model } from 'mongoose';

const idempotencyRecordSchema = new Schema(
  {
    scope: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    requestHash: { type: String, required: true, index: true },
    status: { type: String, required: true, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING', index: true },
    responseStatus: { type: Number, default: null },
    responsePayload: { type: Schema.Types.Mixed, default: null },
    failureReason: { type: String, default: null },
    lockedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

idempotencyRecordSchema.index({ scope: 1, key: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyRecordModel = model('IdempotencyRecord', idempotencyRecordSchema);

import { Schema, model } from 'mongoose';

const eventOutboxSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    topic: { type: String, required: true, index: true },
    aggregateType: { type: String, required: true, index: true },
    aggregateId: { type: String, required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    headers: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, required: true, enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER'], default: 'PENDING', index: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    availableAt: { type: Date, default: null, index: true },
    claimedAt: { type: Date, default: null },
    claimedBy: { type: String, default: null },
    claimExpiresAt: { type: Date, default: null, index: true },
    lastAttemptAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    deadLetterAt: { type: Date, default: null },
    deadLetterReason: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

eventOutboxSchema.index({ status: 1, availableAt: 1 });
eventOutboxSchema.index({ status: 1, claimExpiresAt: 1 });

export const EventOutboxModel = model('EventOutbox', eventOutboxSchema);

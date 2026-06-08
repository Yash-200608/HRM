import { Schema, model } from 'mongoose';

const eventInboxSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    source: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    eventVersion: { type: Number, default: null, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE'],
      default: 'RECEIVED',
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
  { timestamps: true, versionKey: false },
);

eventInboxSchema.index({ organizationId: 1, eventId: 1 }, { unique: true });
eventInboxSchema.index({ source: 1, topic: 1, organizationId: 1 });

export const EventInboxModel = model('EventInbox', eventInboxSchema);

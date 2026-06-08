import { Schema, model } from 'mongoose';

const webhookEventSchema = new Schema(
  {
    provider: { type: String, required: true, index: true },
    providerEventId: { type: String, required: true, index: true },
    eventId: { type: String, default: null, index: true },
    eventType: { type: String, required: true, index: true },
    signature: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, required: true, enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE'], default: 'RECEIVED', index: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    claimedAt: { type: Date, default: null },
    claimedBy: { type: String, default: null },
    claimExpiresAt: { type: Date, default: null, index: true },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    lastAttemptAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

webhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export const WebhookEventModel = model('WebhookEvent', webhookEventSchema);

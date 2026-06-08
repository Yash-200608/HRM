import { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    planCode: { type: String, required: true, index: true },
    status: { type: String, required: true, enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'READ_ONLY', 'SUSPENDED', 'ARCHIVED', 'PURGED'], default: 'TRIAL', index: true },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    autoRenew: { type: Boolean, default: true },
    employeeLimit: { type: Number, default: null },
    creditBalance: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    featureSnapshot: { type: Schema.Types.Mixed, required: true, default: {} },
    metadata: { type: Schema.Types.Mixed, required: false, default: {} },
    renewalLockedUntil: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

subscriptionSchema.index({ organization: 1, status: 1 });

export const SubscriptionModel = model('Subscription', subscriptionSchema);

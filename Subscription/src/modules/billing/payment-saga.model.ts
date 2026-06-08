import { Schema, model } from 'mongoose';

export const paymentSagaStates = [
  'CREATED',
  'ORDER_CREATED',
  'PAYMENT_AUTHORIZED',
  'PAYMENT_CAPTURED',
  'DB_COMMIT_PENDING',
  'COMPLETED',
  'FAILED',
  'COMPENSATING',
  'COMPENSATED',
] as const;

export type PaymentSagaState = (typeof paymentSagaStates)[number];

const paymentSagaSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    provider: { type: String, required: true, index: true },
    providerOrderId: { type: String, default: null },
    providerPaymentId: { type: String, default: null },
    providerRefundId: { type: String, default: null },
    state: {
      type: String,
      required: true,
      enum: [...paymentSagaStates],
      default: 'CREATED',
      index: true,
    },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    compensationAttempts: { type: Number, required: true, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null, index: true },
    lockedBy: { type: String, default: null },
    lastAttemptAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    compensatingAt: { type: Date, default: null },
    compensatedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    compensationError: { type: String, default: null },
    providerPayload: { type: Schema.Types.Mixed, default: {} },
    localPayload: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

paymentSagaSchema.index({ invoice: 1 }, { unique: true, partialFilterExpression: { invoice: { $type: 'objectId' } } });
paymentSagaSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true, partialFilterExpression: { providerOrderId: { $type: 'string' } } });
paymentSagaSchema.index({ provider: 1, providerPaymentId: 1 }, { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } });
paymentSagaSchema.index({ state: 1, nextAttemptAt: 1 });
paymentSagaSchema.index({ state: 1, lockedUntil: 1 });

export const PaymentSagaModel = model('PaymentSaga', paymentSagaSchema);

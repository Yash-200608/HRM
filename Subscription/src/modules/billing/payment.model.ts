import { Schema, model } from 'mongoose';

const paymentSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    provider: { type: String, required: true, default: 'razorpay' },
    providerOrderId: { type: String, default: null },
    providerPaymentId: { type: String, default: null },
    status: { type: String, required: true, enum: ['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'REFUNDED'], default: 'PENDING', index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    failureCode: { type: String, default: null },
    failureReason: { type: String, default: null },
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    authorizedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: null, min: 0 },
    providerRefundId: { type: String, default: null },
    rawRefundPayload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index({ providerOrderId: 1 }, { unique: true, partialFilterExpression: { providerOrderId: { $type: 'string' } } });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } });
paymentSchema.index({ providerRefundId: 1 }, { unique: true, partialFilterExpression: { providerRefundId: { $type: 'string' } } });

export const PaymentModel = model('Payment', paymentSchema);

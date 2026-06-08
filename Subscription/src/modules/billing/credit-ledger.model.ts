import { Schema, model } from 'mongoose';

const creditLedgerSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    entryKey: { type: String, default: null },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null, index: true },
    sourceType: {
      type: String,
      required: true,
      enum: ['PRORATION', 'MANUAL_ADJUSTMENT', 'GOODWILL', 'REFUND', 'OVERPAYMENT', 'INVOICE_APPLIED', 'RECONCILIATION'],
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    note: { type: String, default: null },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null, index: true },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

creditLedgerSchema.index({ organization: 1, createdAt: -1 });
creditLedgerSchema.index({ entryKey: 1 }, { unique: true, partialFilterExpression: { entryKey: { $type: 'string' } } });

export const CreditLedgerModel = model('CreditLedger', creditLedgerSchema);

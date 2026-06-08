import { Schema, model } from 'mongoose';

const invoiceLineItemSchema = new Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    invoiceKey: { type: String, default: null },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'OPEN', 'PAID', 'VOID', 'CANCELLED', 'PAST_DUE', 'REFUNDED'],
      default: 'DRAFT',
      index: true,
    },
    currency: { type: String, required: true, default: 'INR' },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    creditAppliedAmount: { type: Number, required: true, default: 0, min: 0 },
    amountDue: { type: Number, default: null, min: 0 },
    dueAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: null, min: 0 },
    provider: { type: String, default: 'razorpay' },
    providerInvoiceId: { type: String, default: null },
    providerOrderId: { type: String, default: null },
    pdfS3Key: { type: String, default: null, index: true },
    pdfS3Url: { type: String, default: null },
    pdfUploadedAt: { type: Date, default: null },
    lineItems: { type: [invoiceLineItemSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

invoiceSchema.index({ organization: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ invoiceKey: 1 }, { unique: true, partialFilterExpression: { invoiceKey: { $type: 'string' } } });
invoiceSchema.index({ providerInvoiceId: 1 }, { unique: true, partialFilterExpression: { providerInvoiceId: { $type: 'string' } } });
invoiceSchema.index({ providerOrderId: 1 }, { unique: true, partialFilterExpression: { providerOrderId: { $type: 'string' } } });

export const InvoiceModel = model('Invoice', invoiceSchema);

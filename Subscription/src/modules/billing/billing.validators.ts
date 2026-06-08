import { z } from 'zod';

export const billingInvoiceParamsSchema = z.object({
  organizationId: z.string().min(1),
});

export const createInvoiceSchema = z.object({
  subscriptionId: z.string().min(1),
  lineItems: z.array(z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    quantity: z.number().int().min(1),
    unitAmount: z.number().int().min(0),
  })).min(1),
});

export const finalizeInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
});

export const markPaidSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().min(0),
  providerPaymentId: z.string().min(1).optional(),
});

export const razorpayOrderSchema = z.object({
  invoiceId: z.string().min(1),
});

export const paymentIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const capturePaymentSchema = z.object({
  paymentId: z.string().min(1),
  amountInPaise: z.number().int().min(1),
  currency: z.string().min(3).max(3).optional(),
  invoiceId: z.string().min(1).optional(),
});

export const refundPaymentSchema = z.object({
  paymentId: z.string().min(1),
  amountInPaise: z.number().int().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
});

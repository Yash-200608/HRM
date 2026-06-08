import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { capturePaymentSchema, createInvoiceSchema, finalizeInvoiceSchema, markPaidSchema, paymentIdParamsSchema, razorpayOrderSchema, refundPaymentSchema } from './billing.validators';
import { billingService } from './billing.service';

export const billingController = {
  createInvoiceForSubscription: async (req: Request, res: Response) => {
    const input = parseOrThrow(createInvoiceSchema, req.body);
    const invoice = await billingService.createInvoiceForSubscription(input.subscriptionId, input.lineItems, {
      idempotencyKey: req.idempotencyKey,
    });
    res.status(201).json({ data: invoice });
  },
  finalizeInvoice: async (req: Request, res: Response) => {
    const input = parseOrThrow(finalizeInvoiceSchema, req.body);
    const invoice = await billingService.finalizeInvoice(input.invoiceId);
    res.json({ data: invoice });
  },
  markPaid: async (req: Request, res: Response) => {
    const input = parseOrThrow(markPaidSchema, req.body);
    const invoice = await billingService.markInvoicePaid(input.invoiceId, {
      amount: input.amount,
      providerPaymentId: input.providerPaymentId,
    });
    res.json({ data: invoice });
  },
  creditBalance: async (req: Request, res: Response) => {
    const credits = await billingService.getCreditBalance(String(req.params.organizationId));
    res.json({ data: { creditBalance: credits } });
  },
  getInvoicePdf: async (req: Request, res: Response) => {
    const pdf = await billingService.getInvoicePdf(String(req.params.id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${String(req.params.id)}.pdf"`);
    res.send(pdf);
  },
  createRazorpayOrder: async (req: Request, res: Response) => {
    const input = parseOrThrow(razorpayOrderSchema, req.body);
    const invoice = await billingService.createRazorpayOrderForInvoice(input.invoiceId, {
      idempotencyKey: req.idempotencyKey,
    });
    res.json({ data: invoice });
  },
  capturePayment: async (req: Request, res: Response) => {
    const input = parseOrThrow(capturePaymentSchema, req.body);
    const result = await billingService.capturePayment(input, {
      idempotencyKey: req.idempotencyKey,
    });
    res.json({ data: result });
  },
  refundPayment: async (req: Request, res: Response) => {
    const input = parseOrThrow(refundPaymentSchema, req.body);
    const result = await billingService.refundPayment(input, {
      idempotencyKey: req.idempotencyKey,
    });
    res.json({ data: result });
  },
};

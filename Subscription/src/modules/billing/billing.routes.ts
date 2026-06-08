import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler';
import { authenticate } from '../../common/middleware/auth';
import { requireIdempotencyKey } from '../../common/middleware/idempotency';
import { requireResourceOrganizationAccess, requireTenantParamOrganization } from '../../common/middleware/tenant-access';
import { billingRepository } from './billing.repository';
import { billingController } from './billing.controller';

export const billingRouter = Router();

billingRouter.post('/invoices/create', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(billingController.createInvoiceForSubscription));
billingRouter.post('/invoices/finalize', authenticate(['admin', 'service']), asyncHandler(billingController.finalizeInvoice));
billingRouter.get(
  '/invoices/:id/pdf',
  authenticate(['admin', 'service', 'organization']),
  requireResourceOrganizationAccess(async (req) => {
    const invoice = await billingRepository.findInvoiceById(String(req.params.id));
    return invoice ? String(invoice.organization) : null;
  }),
  asyncHandler(billingController.getInvoicePdf),
);
billingRouter.post('/invoices/razorpay-order', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(billingController.createRazorpayOrder));
billingRouter.post('/payments/mark-paid', authenticate(['admin', 'service']), asyncHandler(billingController.markPaid));
billingRouter.post('/payments/capture', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(billingController.capturePayment));
billingRouter.post('/payments/refund', authenticate(['admin', 'service']), requireIdempotencyKey(), asyncHandler(billingController.refundPayment));
billingRouter.get('/credits/:organizationId', authenticate(['admin', 'service', 'organization']), requireTenantParamOrganization('organizationId'), asyncHandler(billingController.creditBalance));

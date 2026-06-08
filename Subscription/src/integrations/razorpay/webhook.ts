import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';

function normalizeSignature(signature: string) {
  return signature.trim().toLowerCase();
}

export function signRazorpayWebhookPayload(rawBody: Buffer, secret: string) {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined) {
  if (!rawBody) {
    throw new AppError('Missing raw webhook body', 400, ErrorCodes.ValidationFailed);
  }

  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError('Webhook secret not configured', 500, ErrorCodes.InternalServerError);
  }

  if (!signature) {
    return false;
  }

  const expected = signRazorpayWebhookPayload(rawBody, env.RAZORPAY_WEBHOOK_SECRET);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(normalizeSignature(signature), 'hex');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function extractRazorpayPaymentEntity(payload: unknown): Record<string, unknown> | null {
  const body = payload as Record<string, unknown> | null | undefined;
  const payment = body?.payload as Record<string, unknown> | undefined;

  const directEntity = payment?.payment as Record<string, unknown> | undefined;
  const nestedEntity = directEntity?.entity as Record<string, unknown> | undefined;
  const payloadEntity = payment?.entity as Record<string, unknown> | undefined;

  return nestedEntity ?? payloadEntity ?? directEntity ?? null;
}

export function extractInvoiceReference(paymentEntity: Record<string, unknown>) {
  const notes = paymentEntity.notes as Record<string, unknown> | undefined;
  return {
    providerPaymentId: typeof paymentEntity.id === 'string' ? paymentEntity.id : null,
    providerInvoiceId:
      typeof paymentEntity.invoice_id === 'string'
        ? paymentEntity.invoice_id
        : typeof notes?.invoice_id === 'string'
          ? (notes.invoice_id as string)
          : typeof notes?.invoiceId === 'string'
            ? (notes.invoiceId as string)
            : typeof paymentEntity.invoiceId === 'string'
              ? (paymentEntity.invoiceId as string)
              : null,
    amountInRupees:
      typeof paymentEntity.amount === 'number' ? Math.round(paymentEntity.amount / 100) : null,
    status: typeof paymentEntity.status === 'string' ? paymentEntity.status : null,
  };
}

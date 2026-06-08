import type { ClientSession } from 'mongoose';
import { withTransaction } from '../../common/db/transaction';
import { billingRepository } from '../billing/billing.repository';
import { billingService } from '../billing/billing.service';
import { extractInvoiceReference, extractRazorpayPaymentEntity } from '../../integrations/razorpay/webhook';
import { webhookRepository } from './webhook.repository';

const WORKER_ID = `webhook-${process.pid}`;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

function backoffMs(attempts: number) {
  const baseDelay = 1000;
  const multiplier = Math.max(0, attempts - 1);
  return Math.min(baseDelay * Math.pow(2, multiplier), 15 * 60 * 1000);
}

export async function reconcileRazorpayEvent(eventType: string, payload: unknown, options?: { session?: ClientSession }) {
  const paymentEntity = extractRazorpayPaymentEntity(payload);
  if (!paymentEntity) {
    return null;
  }

  const reference = extractInvoiceReference(paymentEntity);
  if (!reference.providerPaymentId) {
    return null;
  }

  const existingPayment = await billingRepository.findPaymentByProviderId(reference.providerPaymentId, { session: options?.session });
  const invoice =
    reference.providerInvoiceId != null
      ? await billingRepository.findInvoiceByProviderInvoiceId(reference.providerInvoiceId, { session: options?.session })
      : existingPayment
        ? await billingRepository.findInvoiceById(String(existingPayment.invoice), { session: options?.session })
        : null;

  if (!invoice) {
    return null;
  }

  if (eventType === 'payment.failed') {
    if (invoice.status === 'PAID' || invoice.status === 'REFUNDED' || existingPayment?.status === 'SUCCEEDED') {
      return invoice;
    }

    if (existingPayment) {
      await billingRepository.updatePaymentById(String(existingPayment._id), {
        status: 'FAILED',
        failureReason: 'razorpay_payment_failed',
        failureCode: 'payment_failed',
        rawPayload: paymentEntity,
      }, { session: options?.session });
    } else {
      try {
        await billingRepository.createPayment({
          publicId: `pay_${reference.providerPaymentId}`,
          invoice: invoice._id,
          organization: invoice.organization,
          provider: 'razorpay',
          providerPaymentId: reference.providerPaymentId,
          providerOrderId: typeof paymentEntity.order_id === 'string' ? paymentEntity.order_id : null,
          status: 'FAILED',
          amount: reference.amountInRupees ?? invoice.total,
          currency: invoice.currency,
          failureReason: 'razorpay_payment_failed',
          rawPayload: paymentEntity,
        }, { session: options?.session });
      } catch (error) {
        const duplicatePayment = await billingRepository.findPaymentByProviderId(reference.providerPaymentId, { session: options?.session });
        if (!duplicatePayment) {
          throw error;
        }
      }
    }

    await billingService.markInvoicePastDue(String(invoice._id), 'razorpay_payment_failed', { session: options?.session });
    return invoice;
  }

  if (eventType === 'payment.authorized') {
    if (invoice.status === 'REFUNDED' || existingPayment?.status === 'REFUNDED') {
      return invoice;
    }

    if (invoice.status === 'PAID' || existingPayment?.status === 'SUCCEEDED') {
      return invoice;
    }

    if (existingPayment) {
      await billingRepository.updatePaymentById(String(existingPayment._id), {
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
        amount: reference.amountInRupees ?? invoice.total,
        currency: invoice.currency,
        rawPayload: paymentEntity,
      }, { session: options?.session });
    } else {
      try {
        await billingRepository.createPayment({
          publicId: `pay_${reference.providerPaymentId}`,
          invoice: invoice._id,
          organization: invoice.organization,
          provider: 'razorpay',
          providerPaymentId: reference.providerPaymentId,
          providerOrderId: typeof paymentEntity.order_id === 'string' ? paymentEntity.order_id : null,
          status: 'AUTHORIZED',
          amount: reference.amountInRupees ?? invoice.total,
          currency: invoice.currency,
          authorizedAt: new Date(),
          rawPayload: paymentEntity,
        }, { session: options?.session });
      } catch (error) {
        const duplicatePayment = await billingRepository.findPaymentByProviderId(reference.providerPaymentId, { session: options?.session });
        if (!duplicatePayment) {
          throw error;
        }
      }
    }

    return invoice;
  }

  if (eventType === 'payment.captured') {
    if (invoice.status === 'REFUNDED' || existingPayment?.status === 'REFUNDED') {
      return invoice;
    }

    await billingService.markInvoicePaid(String(invoice._id), {
      amount: reference.amountInRupees ?? invoice.total,
      providerPaymentId: reference.providerPaymentId,
    }, { session: options?.session });
    return invoice;
  }

  return invoice;
}

export async function processWebhookRecord(record: {
  _id: unknown;
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: unknown;
  status: string;
  attempts?: number;
}) {
  const claimed = await webhookRepository.claimForProcessing(String(record._id), WORKER_ID, new Date(Date.now() + CLAIM_TIMEOUT_MS));
  if (!claimed) {
    return null;
  }

  try {
    return await withTransaction(async (session) => {
      const reconciled = await reconcileRazorpayEvent(claimed.eventType, claimed.payload, { session });
      const processed = await webhookRepository.markProcessed(String(claimed._id), { session });
      return processed ?? claimed ?? reconciled ?? record;
    });
  } catch (error) {
    const attempts = Number(claimed.attempts ?? 0);
    const nextAttemptAt = new Date(Date.now() + backoffMs(attempts));
    await webhookRepository.markFailed(
      String(claimed._id),
      error instanceof Error ? error.message : 'webhook_processing_failed',
      nextAttemptAt,
    );
    throw error;
  }
}

export async function reprocessFailedWebhooks() {
  const now = new Date();
  const records = await webhookRepository.listRetryable(now);
  const results = [];

  for (const record of records) {
    results.push(await processWebhookRecord(record));
  }

  return {
    processed: results.length,
    records: results,
  };
}

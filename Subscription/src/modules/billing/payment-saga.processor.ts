import { withTransaction } from '../../common/db/transaction';
import { createPublicId } from '../../common/security/id';
import { logger } from '../../config/logger';
import { metrics } from '../../common/observability/metrics';
import { fetchRazorpayPayment } from '../../integrations/razorpay/client';
import { billingRepository } from './billing.repository';
import { billingService } from './billing.service';
import { paymentSagaRepository } from './payment-saga.repository';
import { paymentSagaService, type PaymentSagaState } from './payment-saga.service';

const WORKER_ID = `payment-saga-${process.pid}`;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 15 * 60 * 1000;

type ProviderPaymentTruth = {
  id: string;
  order_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  status: string;
  raw: Record<string, unknown>;
};

type LocalPaymentRecord = {
  _id: unknown;
  organization: unknown;
  invoice: unknown;
  providerRefundId?: string | null;
  status?: string;
};

function isRecoverableState(state: PaymentSagaState) {
  return ['ORDER_CREATED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'DB_COMMIT_PENDING', 'COMPENSATING', 'FAILED'].includes(state);
}

async function fetchProviderPaymentTruth(providerPaymentId: string): Promise<ProviderPaymentTruth> {
  const providerPayment = (await fetchRazorpayPayment(providerPaymentId)) as Record<string, unknown>;
  const status = typeof providerPayment.status === 'string' ? providerPayment.status : null;
  if (!status) {
    throw new Error('provider_payment_status_missing');
  }

  return {
    id: typeof providerPayment.id === 'string' ? providerPayment.id : providerPaymentId,
    order_id: typeof providerPayment.order_id === 'string' ? providerPayment.order_id : null,
    amount: typeof providerPayment.amount === 'number' ? providerPayment.amount : null,
    currency: typeof providerPayment.currency === 'string' ? providerPayment.currency : null,
    status,
    raw: providerPayment,
  };
}

async function markSagaFailed(sagaId: string, provider: string, failureReason: string) {
  await paymentSagaService.markFailed(sagaId, {
    failureReason,
    nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  metrics.increment('billing_payment_failure_total', { provider });
}

async function settleCapturedSaga(saga: {
  _id: unknown;
  provider: string;
  invoice: unknown;
  state: PaymentSagaState;
  providerPaymentId?: string | null;
}, providerPayment: ProviderPaymentTruth) {
  const invoice = await billingRepository.findInvoiceById(String(saga.invoice));
  if (!invoice) {
    await markSagaFailed(String(saga._id), saga.provider, 'invoice_not_found_for_captured_saga');
    return null;
  }

  if (saga.state === 'ORDER_CREATED' || saga.state === 'PAYMENT_AUTHORIZED') {
    await paymentSagaService.attachProviderPayment(String(saga._id), {
      providerPaymentId: providerPayment.id,
      providerPayload: providerPayment.raw,
    });
    await paymentSagaService.markPaymentCaptured(String(saga._id), {
      providerPaymentId: providerPayment.id,
      providerPayload: providerPayment.raw,
    });
  }

  const result = await withTransaction(async (session) => {
    await paymentSagaService.markDbCommitPending(String(saga._id), { session });
    const settled = await billingService.markInvoicePaid(
      String(invoice._id),
      {
        amount: Math.round((providerPayment.amount ?? Math.round(invoice.total * 100)) / 100),
        providerPaymentId: providerPayment.id,
      },
      { session },
    );
    await paymentSagaService.markCompleted(String(saga._id), { session });

    return {
      invoice: settled,
      providerPayment: {
        id: providerPayment.id,
        order_id: providerPayment.order_id ?? undefined,
        amount: providerPayment.amount ?? undefined,
        currency: providerPayment.currency ?? invoice.currency,
        status: 'captured',
      },
    };
  });

  return result;
}

async function settleAuthorizedSaga(saga: {
  _id: unknown;
  provider: string;
  invoice: unknown;
  providerPaymentId?: string | null;
}, providerPayment: ProviderPaymentTruth) {
  const invoice = await billingRepository.findInvoiceById(String(saga.invoice));
  if (!invoice) {
    await markSagaFailed(String(saga._id), saga.provider, 'invoice_not_found_for_authorized_saga');
    return null;
  }

  if (saga.providerPaymentId !== providerPayment.id) {
    await paymentSagaService.attachProviderPayment(String(saga._id), {
      providerPaymentId: providerPayment.id,
      providerPayload: providerPayment.raw,
    });
  }

  return {
    invoice,
    providerPayment: {
      id: providerPayment.id,
      order_id: providerPayment.order_id ?? undefined,
      amount: providerPayment.amount ?? undefined,
      currency: providerPayment.currency ?? invoice.currency,
      status: 'authorized',
    },
  };
}

async function settleRefundedSaga(saga: {
  _id: unknown;
  provider: string;
  invoice: unknown;
  state: PaymentSagaState;
}, providerPayment: ProviderPaymentTruth) {
  const invoice = await billingRepository.findInvoiceById(String(saga.invoice));
  if (!invoice) {
    await markSagaFailed(String(saga._id), saga.provider, 'invoice_not_found_for_refunded_saga');
    return null;
  }

  await paymentSagaService.beginCompensation(String(saga._id), {
    failureReason: 'provider_payment_refunded',
  });

  const refundAmount = Math.round((providerPayment.amount ?? Math.round(invoice.total * 100)) / 100);

  const result = await withTransaction(async (session) => {
    const existingPayment = (await billingRepository.findPaymentByProviderId(providerPayment.id, { session })) as LocalPaymentRecord | null;

    let paymentRecord: LocalPaymentRecord | null = existingPayment;
    const providerRefundId = existingPayment?.providerRefundId ?? `refund-${providerPayment.id}`;
    if (!paymentRecord) {
      paymentRecord = (await billingRepository.createPayment(
        {
          publicId: createPublicId('pay'),
          invoice: invoice._id,
          organization: invoice.organization,
          provider: 'razorpay',
          providerPaymentId: providerPayment.id,
          providerOrderId: providerPayment.order_id ?? invoice.providerOrderId ?? null,
          status: 'REFUNDED',
          amount: refundAmount,
          currency: providerPayment.currency ?? invoice.currency,
          refundedAt: new Date(),
          refundAmount,
          providerRefundId,
          rawPayload: providerPayment.raw,
          rawRefundPayload: providerPayment.raw,
        },
        { session },
      )) as LocalPaymentRecord;
    } else if (paymentRecord.status !== 'REFUNDED') {
      paymentRecord = (await billingRepository.updatePaymentById(
        String(paymentRecord._id),
        {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundAmount,
          providerRefundId,
          rawRefundPayload: providerPayment.raw,
        },
        { session },
      )) as LocalPaymentRecord | null;
    }

    await billingRepository.updateInvoiceIfStatusIn(
      String(invoice._id),
      ['DRAFT', 'OPEN', 'PAID', 'PAST_DUE'],
      {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount,
      },
      { session },
    );

    await paymentSagaService.markCompensated(String(saga._id), {
      providerRefundId,
      providerPayload: { refund: providerPayment.raw },
    }, { session });

    return {
      invoice,
      payment: paymentRecord,
      providerRefundId,
    };
  });

  metrics.increment('billing_saga_compensation_total', { provider: saga.provider });
  return result;
}

async function compensateCapturedSaga(saga: {
  _id: unknown;
  provider: string;
  invoice: unknown;
}, providerPayment: ProviderPaymentTruth) {
  const invoice = await billingRepository.findInvoiceById(String(saga.invoice));
  if (!invoice) {
    await markSagaFailed(String(saga._id), saga.provider, 'invoice_not_found_for_compensation');
    return null;
  }

  return billingService.refundPayment(
    {
      paymentId: providerPayment.id,
      amountInPaise: providerPayment.amount ?? Math.round(invoice.total * 100),
      invoiceId: String(invoice._id),
    },
    {
      idempotencyKey: `saga-compensate:${String(saga._id)}:${providerPayment.id}:${providerPayment.amount ?? Math.round(invoice.total * 100)}`,
    },
  );
}

export async function processPaymentSagaRecord(record: {
  _id: unknown;
  state: PaymentSagaState;
  provider: string;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  invoice: unknown;
  localPayload?: Record<string, unknown> | null;
}) {
  if (!isRecoverableState(record.state)) {
    return record;
  }

  const claimed = await paymentSagaRepository.claimForProcessing(String(record._id), WORKER_ID, new Date(Date.now() + LOCK_TIMEOUT_MS));
  if (!claimed) {
    return null;
  }

  try {
    const providerPaymentId = claimed.providerPaymentId ?? (claimed.localPayload?.paymentId as string | undefined) ?? null;
    if (!providerPaymentId) {
      return claimed.state === 'ORDER_CREATED' ? null : claimed;
    }

    const providerPayment = await fetchProviderPaymentTruth(providerPaymentId);
    if (providerPayment.status === 'captured') {
      if (claimed.state === 'COMPENSATING' || claimed.state === 'FAILED') {
        return await compensateCapturedSaga(claimed, providerPayment);
      }

      return await settleCapturedSaga(claimed, providerPayment);
    }

    if (providerPayment.status === 'authorized') {
      if (claimed.state === 'ORDER_CREATED' || claimed.state === 'PAYMENT_AUTHORIZED') {
        return await settleAuthorizedSaga(claimed, providerPayment);
      }

      return claimed;
    }

    if (providerPayment.status === 'refunded') {
      return await settleRefundedSaga(claimed, providerPayment);
    }

    if (providerPayment.status === 'failed') {
      await markSagaFailed(String(claimed._id), claimed.provider, 'provider_payment_failed');
      return claimed;
    }

    await markSagaFailed(String(claimed._id), claimed.provider, `unsupported_provider_payment_state:${providerPayment.status}`);
    return claimed;
  } catch (error) {
    await paymentSagaService.markFailed(String(claimed._id), {
      failureReason: error instanceof Error ? error.message : 'payment_saga_recovery_failed',
    });
    metrics.increment('billing_payment_failure_total', { provider: claimed.provider });
    throw error;
  }
}

export async function recoverPaymentSagas() {
  const staleSagas = await paymentSagaService.findStaleSagas(new Date(), STALE_AFTER_MS);
  const summary = { processed: 0, recovered: 0, compensated: 0, failed: 0, skipped: 0 };

  for (const saga of staleSagas) {
    summary.processed += 1;
    try {
      const result = await processPaymentSagaRecord(saga);
      if (!result) {
        summary.skipped += 1;
        continue;
      }

      if ((result as { providerRefundId?: string | null }).providerRefundId) {
        summary.compensated += 1;
      } else {
        summary.recovered += 1;
      }
    } catch (error) {
      summary.failed += 1;
      logger.error('payment_saga_recovery_failed', {
        sagaId: String(saga._id),
        state: saga.state,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  return summary;
}

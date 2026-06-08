import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { metrics } from '../../common/observability/metrics';
import { verifyRazorpayWebhookSignature } from '../../integrations/razorpay/webhook';
import { webhookRepository } from './webhook.repository';
import { processWebhookRecord, reconcileRazorpayEvent } from './webhook.processor';

export const webhookService = {
  processRazorpayWebhook: async (input: {
    eventId: string;
    eventType: string;
    payload: unknown;
    rawBody?: Buffer;
    signature?: string;
  }) => {
    const verified = verifyRazorpayWebhookSignature(input.rawBody, input.signature);
    if (!verified) {
      metrics.increment('webhook_signature_invalid_total', { provider: 'razorpay' });
      throw new AppError('Invalid webhook signature', 401, ErrorCodes.WebhookSignatureInvalid);
    }

    const providerEventId = input.eventId;
    const existing = await webhookRepository.findByProviderEventId('razorpay', providerEventId);
    if (existing && ['PROCESSED', 'PROCESSING'].includes(existing.status)) {
      metrics.increment('webhook_duplicate_total', { provider: 'razorpay' });
      return { record: existing, deduped: true };
    }

    const record = existing
      ? existing
      : await webhookRepository.createOrGet({
          provider: 'razorpay',
          providerEventId,
          eventId: providerEventId,
          eventType: input.eventType,
          signature: input.signature ?? null,
          payload: input.payload,
          status: 'RECEIVED',
        });

    try {
      const processed = await processWebhookRecord(record);
      if (!processed) {
        metrics.increment('webhook_duplicate_total', { provider: 'razorpay' });
        const latest = await webhookRepository.findByProviderEventId('razorpay', providerEventId);
        return { record: latest ?? record, deduped: true };
      }

      const finalRecord = await webhookRepository.findByProviderEventId('razorpay', providerEventId);
      metrics.increment('webhook_processed_total', { provider: 'razorpay', eventType: record.eventType });
      return { record: finalRecord ?? processed ?? record, deduped: false };
    } catch (error) {
      metrics.increment('webhook_processing_failure_total', { provider: 'razorpay', eventType: record.eventType });
      throw error;
    }
  },
  reconcileRazorpayEvent,
};

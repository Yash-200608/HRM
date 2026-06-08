import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { metrics } from '../../common/observability/metrics';
import { captureException } from '../../integrations/sentry';
import { deliverOutboxEvent } from '../../integrations/outbox-delivery';
import { eventRepository } from '../../modules/events/event.repository';

const WORKER_ID = `outbox-${process.pid}`;
const VISIBLE_TIMEOUT_MS = Math.max(5000, env.OUTBOX_REQUEST_TIMEOUT_MS * 2);

function backoffMs(attempts: number) {
  const base = env.OUTBOX_RETRY_BASE_DELAY_MS;
  const multiplier = Math.max(0, attempts - 1);
  const delay = base * Math.pow(2, multiplier);
  return Math.min(delay, 15 * 60 * 1000);
}

function isRetryable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('outbox_delivery_url_not_configured') || message.includes('outbox_delivery_secret_not_configured')) {
    return false;
  }
  return true;
}

export async function publishPendingOutbox() {
  const summary = { processed: 0, published: 0, retried: 0, deadLettered: 0 };

  while (true) {
    const event = await eventRepository.claimNextOutbox(WORKER_ID, VISIBLE_TIMEOUT_MS);
    if (!event) {
      break;
    }

    summary.processed += 1;

    try {
      await deliverOutboxEvent(event);
      await eventRepository.markOutboxPublished(String(event._id));
      metrics.increment('outbox_published_total', { topic: event.topic });
      summary.published += 1;
    } catch (error) {
      captureException(error, { eventId: event.eventId, topic: event.topic, outboxId: String(event._id) });
      const attempts = event.attempts ?? 0;
      if (!isRetryable(error) || attempts >= env.OUTBOX_MAX_ATTEMPTS) {
        await eventRepository.markOutboxDeadLetter(
          String(event._id),
          error instanceof Error ? error.message : 'outbox_delivery_failed',
        );
        metrics.increment('outbox_dead_letter_total', { topic: event.topic });
        summary.deadLettered += 1;
        logger.error('outbox_dead_lettered', {
          eventId: event.eventId,
          topic: event.topic,
          attempts,
          error: error instanceof Error ? error.message : 'unknown_error',
        });
        continue;
      }

      const nextAttemptAt = new Date(Date.now() + backoffMs(attempts));
      await eventRepository.markOutboxRetry(
        String(event._id),
        nextAttemptAt,
        error instanceof Error ? error.message : 'outbox_delivery_failed',
      );
      metrics.increment('outbox_retry_total', { topic: event.topic });
      summary.retried += 1;
      logger.warn('outbox_retry_scheduled', {
        eventId: event.eventId,
        topic: event.topic,
        attempts,
        nextAttemptAt: nextAttemptAt.toISOString(),
      });
    }
  }

  return summary;
}

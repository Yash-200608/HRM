import { createHmac } from 'node:crypto';
import { env } from '../../config/env';

type OutboxEvent = {
  eventId: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  organization?: unknown;
  payload: unknown;
  headers?: Record<string, unknown>;
  attempts?: number;
  createdAt?: string | Date;
  nextAttemptAt?: Date | null;
};

function signBody(body: string) {
  if (!env.OUTBOX_DELIVERY_SECRET) {
    throw new Error('outbox_delivery_secret_not_configured');
  }

  return createHmac('sha256', env.OUTBOX_DELIVERY_SECRET).update(body).digest('hex');
}

export async function deliverOutboxEvent(event: OutboxEvent) {
  if (!env.OUTBOX_DELIVERY_URL) {
    throw new Error('outbox_delivery_url_not_configured');
  }

  const body = JSON.stringify({
    eventId: event.eventId,
    topic: event.topic,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    organizationId: event.organization == null ? null : String(event.organization),
    headers: event.headers ?? {},
    payload: event.payload,
    attempts: event.attempts ?? 0,
    emittedAt: event.createdAt ?? new Date().toISOString(),
    nextAttemptAt: event.nextAttemptAt ? event.nextAttemptAt.toISOString() : null,
  });

  const response = await fetch(env.OUTBOX_DELIVERY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-outbox-event-id': event.eventId,
      'x-outbox-topic': event.topic,
      'x-outbox-aggregate-type': event.aggregateType,
      'x-outbox-aggregate-id': event.aggregateId,
      'x-outbox-signature': signBody(body),
    },
    body,
    signal: AbortSignal.timeout(env.OUTBOX_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`outbox_delivery_failed:${response.status}:${text.slice(0, 200)}`);
  }

  return response;
}

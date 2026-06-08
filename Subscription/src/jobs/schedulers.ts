import { billingQueue, webhookQueue } from './queues';

export async function registerSchedulers() {
  await billingQueue.add(
    'renewals.tick',
    { kind: 'renewals' },
    { repeat: { pattern: '0 * * * *' } },
  );

  await billingQueue.add(
    'trial-expiry.tick',
    { kind: 'trial-expiry' },
    { repeat: { pattern: '0 * * * *' } },
  );

  await billingQueue.add(
    'archive.tick',
    { kind: 'archive' },
    { repeat: { pattern: '0 * * * *' } },
  );

  await billingQueue.add(
    'payment-saga.recover',
    { kind: 'payment-saga-recover' },
    { repeat: { pattern: '*/5 * * * *' } },
  );

  await billingQueue.add(
    'usage.inbox.process',
    { kind: 'usage-inbox-process' },
    { repeat: { pattern: '*/2 * * * *' } },
  );

  await billingQueue.add(
    'usage.reconcile',
    { kind: 'usage-reconcile' },
    { repeat: { pattern: '0 */1 * * *' } },
  );

  await webhookQueue.add(
    'outbox.publish',
    { kind: 'outbox' },
    { repeat: { pattern: '*/5 * * * *' } },
  );

  await webhookQueue.add(
    'webhook.reprocess.failed',
    { kind: 'webhook-reprocess-failed' },
    { repeat: { pattern: '*/5 * * * *' } },
  );
}

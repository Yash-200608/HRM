import { Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { metrics } from '../common/observability/metrics';
import { billingQueue, webhookQueue } from './queues';
import { processRenewals } from './processors/renewals.processor';
import { processTrialExpiry } from './processors/trial-expiry.processor';
import { publishPendingOutbox } from './processors/outbox.processor';
import { processArchiveLifecycle } from './processors/archive.processor';
import { recoverPaymentSagas } from '../modules/billing/payment-saga.processor';
import { processInboxBatch } from '../modules/usage/inbox.processor';
import { processReconciliation } from '../modules/usage/reconciliation.processor';
import { reprocessFailedWebhooks } from '../modules/webhooks/webhook.processor';

const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const billingWorker = new Worker(
  'billing',
  async (job) => {
    if (job.name === 'renewals.tick') {
      return processRenewals();
    }

    if (job.name === 'trial-expiry.tick') {
      return processTrialExpiry();
    }

    if (job.name === 'archive.tick') {
      return processArchiveLifecycle();
    }

    if (job.name === 'payment-saga.recover') {
      return recoverPaymentSagas();
    }

    if (job.name === 'usage.inbox.process') {
      return processInboxBatch();
    }

    if (job.name === 'usage.reconcile') {
      return processReconciliation();
    }

    return null;
  },
  {
    connection: connection as never,
    concurrency: 2,
  },
);

const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    if (job.name === 'outbox.publish') {
      return publishPendingOutbox();
    }

    if (job.name === 'webhook.reprocess.failed') {
      return reprocessFailedWebhooks();
    }

    return null;
  },
  {
    connection: connection as never,
    concurrency: 1,
  },
);

async function refreshQueueBacklogMetrics() {
  const [billingCounts, webhookCounts] = await Promise.all([
    billingQueue.getJobCounts('waiting', 'delayed'),
    webhookQueue.getJobCounts('waiting', 'delayed'),
  ]);

  metrics.gauge('billing_queue_backlog', undefined, Number(billingCounts.waiting ?? 0) + Number(billingCounts.delayed ?? 0));
  metrics.gauge('webhook_queue_backlog', undefined, Number(webhookCounts.waiting ?? 0) + Number(webhookCounts.delayed ?? 0));
}

const queueBacklogInterval = setInterval(() => {
  void refreshQueueBacklogMetrics().catch((error) => {
    logger.error('queue_backlog_metrics_refresh_failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  });
}, 60_000);

queueBacklogInterval.unref();
void refreshQueueBacklogMetrics().catch((error) => {
  logger.error('queue_backlog_metrics_refresh_failed', {
    error: error instanceof Error ? error.message : 'unknown_error',
  });
});

billingWorker.on('failed', (job, error) => {
  logger.error('billing_worker_failed', {
    jobId: job?.id,
    name: job?.name,
    error: error.message,
  });
});

webhookWorker.on('failed', (job, error) => {
  logger.error('webhook_worker_failed', {
    jobId: job?.id,
    name: job?.name,
    error: error.message,
  });
});

async function shutdown(signal: string) {
  logger.info('worker_shutdown_requested', { signal });
  clearInterval(queueBacklogInterval);
  await Promise.all([billingWorker.close(), webhookWorker.close()]);
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

logger.info('workers_started');

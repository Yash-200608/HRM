import { logger } from '../../config/logger';
import { metrics } from '../../common/observability/metrics';
import { billingService } from '../../modules/billing/billing.service';
import { subscriptionRepository } from '../../modules/subscriptions/subscription.repository';

export async function processRenewals() {
  const now = new Date();
  const dueSubscriptions = await subscriptionRepository.findActiveForRenewal(now);
  const summary = { processed: 0, renewed: 0, skipped: 0, failed: 0 };

  for (const subscription of dueSubscriptions) {
    summary.processed += 1;

    try {
      const result = await billingService.renewSubscription(String(subscription._id));

      if (!result) {
        summary.skipped += 1;
        continue;
      }

      metrics.increment('billing_renewal_success_total', { planCode: subscription.planCode });
      summary.renewed += 1;
    } catch (error) {
      summary.failed += 1;
      metrics.increment('billing_renewal_failure_total', { planCode: subscription.planCode });
      logger.error('renewal_job_failed', {
        subscriptionId: String(subscription._id),
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  logger.info('renewals_processed', {
    processed: summary.processed,
    renewed: summary.renewed,
    skipped: summary.skipped,
    failed: summary.failed,
  });

  return summary;
}

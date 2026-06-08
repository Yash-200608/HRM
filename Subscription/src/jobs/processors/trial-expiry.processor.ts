import { logger } from '../../config/logger';
import { subscriptionRepository } from '../../modules/subscriptions/subscription.repository';
import { planRepository } from '../../modules/plans/plan.repository';
import { eventRepository } from '../../modules/events/event.repository';

export async function processTrialExpiry() {
  const now = new Date();
  const expiredTrials = await subscriptionRepository.findTrialExpiring(now);
  const freePlan = await planRepository.findByCode('free');

  if (!freePlan) {
    logger.warn('free_plan_missing_for_trial_expiry');
    return { processed: 0 };
  }

  for (const subscription of expiredTrials) {
    try {
      await subscriptionRepository.updateById(String(subscription._id), {
        plan: freePlan._id,
        planCode: freePlan.code,
        status: 'ACTIVE',
        employeeLimit: freePlan.employeeLimit,
        currency: freePlan.currency,
        featureSnapshot: freePlan.features,
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: null,
      });

      await eventRepository.createOutbox({
        eventId: `evt_trial_${String(subscription._id)}_${Date.now()}`,
        topic: 'subscription.expired',
        aggregateType: 'Subscription',
        aggregateId: String(subscription._id),
        organization: subscription.organization,
        payload: {
          subscriptionId: String(subscription._id),
          planCode: freePlan.code,
          status: 'ACTIVE',
        },
        headers: {},
        status: 'PENDING',
      });
    } catch (error) {
      logger.error('trial_expiry_job_failed', {
        subscriptionId: String(subscription._id),
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  logger.info('trial_expiry_processed', { count: expiredTrials.length });
  return { processed: expiredTrials.length };
}

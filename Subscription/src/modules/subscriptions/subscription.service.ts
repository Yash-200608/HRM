import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { createPublicId } from '../../common/security/id';
import { withTransaction } from '../../common/db/transaction';
import { planRepository } from '../plans/plan.repository';
import { planService } from '../plans/plan.service';
import { organizationRepository } from '../organizations/organization.repository';
import { subscriptionRepository } from './subscription.repository';
import { canPerformAction, canTransition } from './subscription.state-machine';
import type { FeatureMatrix } from '../plans/plan.types';
import { runIdempotentOperation } from '../idempotency/idempotency.service';
import { archiveService } from '../archive/archive.service';
import { billingService } from '../billing/billing.service';
import { creditLedgerService, calculateProration, resolvePlanPrice } from '../billing/credit-ledger.service';
import { eventRepository } from '../events/event.repository';
import { metrics } from '../../common/observability/metrics';

function buildSnapshot(features: FeatureMatrix) {
  return { ...features };
}

function toPeriodDate(value: unknown) {
  return value instanceof Date ? value : value ? new Date(String(value)) : null;
}

function isPlanWithPricing(plan: unknown): plan is { billingInterval: 'month' | 'year'; priceMonthly: number; priceYearly: number; _id?: unknown } {
  if (!plan || typeof plan !== 'object') {
    return false;
  }

  const candidate = plan as { billingInterval?: unknown; priceMonthly?: unknown; priceYearly?: unknown };
  return (
    (candidate.billingInterval === 'month' || candidate.billingInterval === 'year') &&
    typeof candidate.priceMonthly === 'number' &&
    typeof candidate.priceYearly === 'number'
  );
}

export const subscriptionService = {
  create: async (input: { organizationId: string; planCode: string }, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const organization = await organizationRepository.findById(input.organizationId);
      if (!organization) {
        throw new AppError('Organization not found', 404, ErrorCodes.NotFound);
      }
      await archiveService.assertOrganizationWritable(String(organization._id));

      const plan = await planRepository.findByCode(input.planCode);
      if (!plan) {
        throw new AppError('Plan not found', 404, ErrorCodes.NotFound);
      }

      const existing = await subscriptionRepository.findByOrganization(input.organizationId);
      if (existing) {
        throw new AppError('Subscription already exists', 409, ErrorCodes.Conflict);
      }

      return subscriptionRepository.create({
        publicId: createPublicId('sub'),
        organization: input.organizationId,
        plan: plan._id,
        planCode: plan.code,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        employeeLimit: plan.employeeLimit,
        currency: plan.currency,
        featureSnapshot: buildSnapshot(plan.features),
      });
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'subscription:create',
        key: options.idempotencyKey,
        payload: input,
        operation: work,
      });
    }

    return work();
  },
  getById: (id: string) => subscriptionRepository.findById(id),
  upgrade: async (id: string, planCode: string, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const result = await withTransaction(async (session) => {
        const subscription = await subscriptionRepository.findById(id, { session });
        if (!subscription) {
          throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
        }
        await archiveService.assertOrganizationWritable(String(subscription.organization));
        const expectedUpdatedAt = subscription.updatedAt instanceof Date ? subscription.updatedAt : null;

        const nextPlan = await planRepository.findByCode(planCode, { session });
        if (!nextPlan) {
          throw new AppError('Plan not found', 404, ErrorCodes.NotFound);
        }

        if (!canPerformAction(subscription.status, 'UPGRADE')) {
          throw new AppError('Invalid subscription transition', 409, ErrorCodes.Conflict);
        }

        const currentPlan = isPlanWithPricing(subscription.plan)
          ? subscription.plan
          : await planRepository.findByCode(subscription.planCode, { session });
        if (!currentPlan) {
          throw new AppError('Current plan not found', 404, ErrorCodes.NotFound);
        }

        const periodStart = toPeriodDate(subscription.currentPeriodStart) ?? new Date();
        const periodEnd = toPeriodDate(subscription.currentPeriodEnd) ?? periodStart;
        const proration = calculateProration({
          oldPlanPrice: resolvePlanPrice(currentPlan),
          newPlanPrice: resolvePlanPrice(nextPlan),
          periodStart,
          periodEnd,
          now: new Date(),
        });

        const updatedSubscription = expectedUpdatedAt
          ? await subscriptionRepository.updateByIdIfUpdatedAt(
              id,
              expectedUpdatedAt,
              {
                plan: nextPlan._id,
                planCode: nextPlan.code,
                status: 'ACTIVE',
                employeeLimit: nextPlan.employeeLimit,
                currency: nextPlan.currency,
                featureSnapshot: buildSnapshot(nextPlan.features),
                metadata: {
                  ...(subscription.metadata ?? {}),
                  lastPlanChangeAt: new Date(),
                  lastPlanChangeType: 'UPGRADE',
                  lastProrationNetCharge: proration.netCharge,
                  lastProrationRatio: proration.remainingRatio,
                },
              },
              { session },
            )
          : null;

        if (!updatedSubscription) {
          throw new AppError('Subscription changed during upgrade', 409, ErrorCodes.Conflict);
        }

        let prorationInvoice = null;
        let prorationCredit = null;

        if (proration.netCharge > 0) {
          prorationInvoice = await billingService.createInvoiceForSubscription(
            id,
            [
              {
                code: nextPlan.code,
                description: `Proration charge for upgrade to ${nextPlan.name}`,
                quantity: 1,
                unitAmount: proration.netCharge,
              },
            ],
            {
              session,
              invoiceKey: `proration-upgrade:${id}:${periodEnd.toISOString()}:${nextPlan.code}`,
            },
          );
          if (prorationInvoice) {
            await billingService.finalizeInvoice(String(prorationInvoice._id), { session });
          }
        } else if (proration.netCharge < 0) {
          prorationCredit = await creditLedgerService.addCredit(
            {
              organizationId: String(subscription.organization),
              subscriptionId: String(subscription._id),
              amount: Math.abs(proration.netCharge),
              sourceType: 'PRORATION',
              note: `Upgrade proration credit for ${nextPlan.code}`,
              entryKey: `proration-upgrade:${id}:${periodEnd.toISOString()}:${nextPlan.code}`,
            },
            { session },
          );
        }

        await eventRepository.createOutbox(
          {
            eventId: `subscription.upgraded:${String(subscription._id)}:${nextPlan.code}:${periodEnd.toISOString()}`,
            topic: 'subscription.upgraded',
            aggregateType: 'Subscription',
            aggregateId: String(subscription._id),
            organization: subscription.organization,
            payload: {
              subscriptionId: String(subscription._id),
              fromPlanCode: subscription.planCode,
              toPlanCode: nextPlan.code,
              netCharge: proration.netCharge,
              prorationInvoiceId: prorationInvoice ? String(prorationInvoice._id) : null,
              prorationCreditId: prorationCredit ? String(prorationCredit._id) : null,
            },
            headers: {},
            status: 'PENDING',
          },
          { session },
        );

        metrics.increment('subscription_upgrade_total', { planCode: nextPlan.code });

        return {
          subscription: updatedSubscription,
          prorationInvoiceId: prorationInvoice ? String(prorationInvoice._id) : null,
        };
      });

      return result.subscription;
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'subscription:upgrade',
        key: options.idempotencyKey,
        payload: { id, planCode },
        operation: work,
      });
    }

    return work();
  },
  downgrade: async (id: string, planCode: string, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const result = await withTransaction(async (session) => {
        const subscription = await subscriptionRepository.findById(id, { session });
        if (!subscription) {
          throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
        }
        await archiveService.assertOrganizationWritable(String(subscription.organization));
        const expectedUpdatedAt = subscription.updatedAt instanceof Date ? subscription.updatedAt : null;

        const nextPlan = await planRepository.findByCode(planCode, { session });
        if (!nextPlan) {
          throw new AppError('Plan not found', 404, ErrorCodes.NotFound);
        }

        if (!canPerformAction(subscription.status, 'DOWNGRADE')) {
          throw new AppError('Invalid subscription transition', 409, ErrorCodes.Conflict);
        }

        const currentPlan = isPlanWithPricing(subscription.plan)
          ? subscription.plan
          : await planRepository.findByCode(subscription.planCode, { session });
        if (!currentPlan) {
          throw new AppError('Current plan not found', 404, ErrorCodes.NotFound);
        }

        const periodStart = toPeriodDate(subscription.currentPeriodStart) ?? new Date();
        const periodEnd = toPeriodDate(subscription.currentPeriodEnd) ?? periodStart;
        const proration = calculateProration({
          oldPlanPrice: resolvePlanPrice(currentPlan),
          newPlanPrice: resolvePlanPrice(nextPlan),
          periodStart,
          periodEnd,
          now: new Date(),
        });

        const updatedSubscription = expectedUpdatedAt
          ? await subscriptionRepository.updateByIdIfUpdatedAt(
              id,
              expectedUpdatedAt,
              {
                plan: nextPlan._id,
                planCode: nextPlan.code,
                status: 'ACTIVE',
                employeeLimit: nextPlan.employeeLimit,
                currency: nextPlan.currency,
                featureSnapshot: buildSnapshot(nextPlan.features),
                metadata: {
                  ...(subscription.metadata ?? {}),
                  lastPlanChangeAt: new Date(),
                  lastPlanChangeType: 'DOWNGRADE',
                  lastProrationNetCharge: proration.netCharge,
                  lastProrationRatio: proration.remainingRatio,
                },
              },
              { session },
            )
          : null;

        if (!updatedSubscription) {
          throw new AppError('Subscription changed during downgrade', 409, ErrorCodes.Conflict);
        }

        let prorationInvoice = null;
        let prorationCredit = null;

        if (proration.netCharge > 0) {
          prorationInvoice = await billingService.createInvoiceForSubscription(
            id,
            [
              {
                code: nextPlan.code,
                description: `Proration charge for downgrade to ${nextPlan.name}`,
                quantity: 1,
                unitAmount: proration.netCharge,
              },
            ],
            {
              session,
              invoiceKey: `proration-downgrade:${id}:${periodEnd.toISOString()}:${nextPlan.code}`,
            },
          );
          if (prorationInvoice) {
            await billingService.finalizeInvoice(String(prorationInvoice._id), { session });
          }
        } else if (proration.netCharge < 0) {
          prorationCredit = await creditLedgerService.addCredit(
            {
              organizationId: String(subscription.organization),
              subscriptionId: String(subscription._id),
              amount: Math.abs(proration.netCharge),
              sourceType: 'PRORATION',
              note: `Downgrade proration credit for ${nextPlan.code}`,
              entryKey: `proration-downgrade:${id}:${periodEnd.toISOString()}:${nextPlan.code}`,
            },
            { session },
          );
        }

        await eventRepository.createOutbox(
          {
            eventId: `subscription.downgraded:${String(subscription._id)}:${nextPlan.code}:${periodEnd.toISOString()}`,
            topic: 'subscription.downgraded',
            aggregateType: 'Subscription',
            aggregateId: String(subscription._id),
            organization: subscription.organization,
            payload: {
              subscriptionId: String(subscription._id),
              fromPlanCode: subscription.planCode,
              toPlanCode: nextPlan.code,
              netCharge: proration.netCharge,
              prorationInvoiceId: prorationInvoice ? String(prorationInvoice._id) : null,
              prorationCreditId: prorationCredit ? String(prorationCredit._id) : null,
            },
            headers: {},
            status: 'PENDING',
          },
          { session },
        );

        metrics.increment('subscription_downgrade_total', { planCode: nextPlan.code });

        return {
          subscription: updatedSubscription,
          prorationInvoiceId: prorationInvoice ? String(prorationInvoice._id) : null,
        };
      });

      return result.subscription;
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'subscription:downgrade',
        key: options.idempotencyKey,
        payload: { id, planCode },
        operation: work,
      });
    }

    return work();
  },
  cancel: async (id: string, options?: { idempotencyKey?: string }) => {
    const work = async () => {
      const subscription = await subscriptionRepository.findById(id);
      if (!subscription) {
        throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
      }
      await archiveService.assertOrganizationWritable(String(subscription.organization));

      if (!canPerformAction(subscription.status, 'CANCEL') || !canTransition(subscription.status, 'ARCHIVED')) {
        throw new AppError('Invalid subscription transition', 409, ErrorCodes.Conflict);
      }

      return subscriptionRepository.updateById(id, { status: 'ARCHIVED', cancelledAt: new Date(), archivedAt: new Date() });
    };

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'subscription:cancel',
        key: options.idempotencyKey,
        payload: { id },
        operation: work,
      });
    }

    return work();
  },
  seedRequiredPlanCache: () => planService.seedDefaults(),
};

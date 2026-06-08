import type { ClientSession } from 'mongoose';
import { createPublicId } from '../../common/security/id';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { billingRepository } from './billing.repository';
import { subscriptionRepository } from '../subscriptions/subscription.repository';

type DbOptions = { session?: ClientSession };

type PlanLike = {
  billingInterval: string;
  priceMonthly: number;
  priceYearly: number;
};

export function resolvePlanPrice(plan: PlanLike) {
  return plan.billingInterval === 'year' ? plan.priceYearly : plan.priceMonthly;
}

export function calculateProration(input: {
  oldPlanPrice: number;
  newPlanPrice: number;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const totalDuration = Math.max(input.periodEnd.getTime() - input.periodStart.getTime(), 0);
  if (totalDuration === 0) {
    return {
      remainingRatio: 0,
      unusedCredit: 0,
      remainingCost: 0,
      netCharge: 0,
    };
  }

  const remainingDuration = Math.max(input.periodEnd.getTime() - now.getTime(), 0);
  const remainingRatio = Math.min(Math.max(remainingDuration / totalDuration, 0), 1);
  const unusedCredit = Math.round(input.oldPlanPrice * remainingRatio);
  const remainingCost = Math.round(input.newPlanPrice * remainingRatio);
  const netCharge = remainingCost - unusedCredit;

  return {
    remainingRatio,
    unusedCredit,
    remainingCost,
    netCharge,
  };
}

async function getSubscriptionByOrganization(organizationId: string, options?: DbOptions) {
  const subscription = await subscriptionRepository.findByOrganization(organizationId, options);
  if (!subscription) {
    throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
  }

  return subscription;
}

async function upsertCreditEntry(payload: Record<string, unknown>, options?: DbOptions) {
  const entryKey = typeof payload.entryKey === 'string' ? payload.entryKey : null;
  if (entryKey) {
    const existing = await billingRepository.findCreditEntryByEntryKey(entryKey, options);
    if (existing) {
      return { record: existing, created: false };
    }
  }

  try {
    const record = await billingRepository.createCreditEntry(payload, options);
    return { record, created: true };
  } catch (error) {
    if (entryKey) {
      const existing = await billingRepository.findCreditEntryByEntryKey(entryKey, options);
      if (existing) {
        return { record: existing, created: false };
      }
    }

    throw error;
  }
}

export const creditLedgerService = {
  getMaterializedBalance: async (organizationId: string, options?: DbOptions) => {
    const subscription = await getSubscriptionByOrganization(organizationId, options);
    return subscription.creditBalance ?? 0;
  },
  getLedgerBalance: async (organizationId: string, options?: DbOptions) => {
    const credits = await billingRepository.findCreditsByOrganization(organizationId, options);
    return credits.reduce((sum, credit) => sum + Number(credit.amount ?? 0), 0);
  },
  addCredit: async (input: {
    organizationId: string;
    subscriptionId?: string;
    amount: number;
    sourceType: 'PRORATION' | 'MANUAL_ADJUSTMENT' | 'GOODWILL' | 'REFUND' | 'OVERPAYMENT' | 'INVOICE_APPLIED' | 'RECONCILIATION';
    note?: string | null;
    invoiceId?: string | null;
    entryKey?: string | null;
    currency?: string;
  }, options?: DbOptions) => {
    if (input.amount <= 0) {
      return null;
    }

    const subscription = await getSubscriptionByOrganization(input.organizationId, options);
    if (input.entryKey) {
      const existing = await billingRepository.findCreditEntryByEntryKey(input.entryKey, options);
      if (existing) {
        return existing;
      }
    }

    const creditResult = await upsertCreditEntry(
      {
        publicId: createPublicId('cred'),
        entryKey: input.entryKey ?? null,
        organization: input.organizationId,
        subscription: input.subscriptionId ?? subscription._id,
        sourceType: input.sourceType,
        amount: Math.round(input.amount),
        currency: input.currency ?? subscription.currency,
        note: input.note ?? null,
        invoice: input.invoiceId ?? null,
        appliedAt: new Date(),
      },
      options,
    );

    if (creditResult.created) {
      await subscriptionRepository.adjustCreditBalanceById(String(subscription._id), Math.round(input.amount), options);
    }

    return creditResult.record;
  },
  consumeCreditsForInvoice: async (input: {
    organizationId: string;
    subscriptionId: string;
    invoiceId: string;
    currency: string;
    amountDue: number;
  }, options?: DbOptions) => {
    const subscription = await getSubscriptionByOrganization(input.organizationId, options);
    const availableBalance = Math.max(Number(subscription.creditBalance ?? 0), 0);
    const creditAppliedAmount = Math.min(Math.round(input.amountDue), availableBalance);

    if (creditAppliedAmount <= 0) {
      return {
        creditAppliedAmount: 0,
        amountDue: Math.round(input.amountDue),
        balanceAfter: availableBalance,
      };
    }

    const entryKey = `invoice-credit:${input.invoiceId}`;
    const existing = await billingRepository.findCreditEntryByEntryKey(entryKey, options);
    if (existing) {
      const appliedAmount = Math.abs(Number(existing.amount ?? 0));
      const currentSubscription = await getSubscriptionByOrganization(input.organizationId, options);
      return {
        creditAppliedAmount: appliedAmount,
        amountDue: Math.max(Math.round(input.amountDue) - appliedAmount, 0),
        balanceAfter: Math.max(Number(currentSubscription.creditBalance ?? 0), 0),
      };
    }

    const entry = await upsertCreditEntry(
      {
        publicId: createPublicId('cred'),
        entryKey,
        organization: input.organizationId,
        subscription: input.subscriptionId,
        sourceType: 'INVOICE_APPLIED',
        amount: -creditAppliedAmount,
        currency: input.currency,
        note: 'Credits auto-applied to invoice',
        invoice: input.invoiceId,
        appliedAt: new Date(),
      },
      options,
    );

    if (entry.created) {
      const updatedSubscription = await subscriptionRepository.adjustCreditBalanceById(input.subscriptionId, -creditAppliedAmount, options);
      if (!updatedSubscription) {
        throw new AppError('Credit balance update conflict', 409, ErrorCodes.Conflict);
      }
    }

    return {
      creditAppliedAmount,
      amountDue: Math.max(Math.round(input.amountDue) - creditAppliedAmount, 0),
      balanceAfter: Math.max(availableBalance - creditAppliedAmount, 0),
    };
  },
  reconcileBalance: async (organizationId: string, options?: DbOptions) => {
    const subscription = await getSubscriptionByOrganization(organizationId, options);
    const ledgerBalance = await creditLedgerService.getLedgerBalance(organizationId, options);
    const materializedBalance = Number(subscription.creditBalance ?? 0);
    const drift = ledgerBalance - materializedBalance;

    if (drift !== 0) {
      await subscriptionRepository.adjustCreditBalanceById(String(subscription._id), drift, options);
    }

    return {
      organizationId,
      ledgerBalance,
      materializedBalance,
      drift,
      corrected: drift !== 0,
    };
  },
  calculateProration,
  resolvePlanPrice,
};

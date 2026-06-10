import { InvoiceModel } from '../billing/invoice.model';
import { PaymentModel } from '../billing/payment.model';
import { organizationRepository } from '../organizations/organization.repository';
import { PlanModel } from '../plans/plan.model';
import { SubscriptionModel } from '../subscriptions/subscription.model';
import { metrics } from '../../common/observability/metrics';
import { eventRepository } from '../events/event.repository';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';

const featureKeys = [
  'employeeManagement',
  'attendance',
  'leaveManagement',
  'basicReports',
  'payroll',
  'taskManagement',
  'employeeSelfService',
  'announcements',
  'shiftManagement',
  'advancedReports',
  'auditLogs',
  'employeeDocuments',
  'customFields',
  'dataExport',
  'approvalWorkflows',
  'recruitment',
  'performanceReviews',
  'assetManagement',
  'learningManagement',
  'apiAccess',
  'workflowAutomation',
  'customBranding',
  'sso',
  'whiteLabel',
  'leadPortal',
  'prioritySupport',
  'customIntegrations',
] as const;

function planMonthlyEquivalent(plan: { billingInterval: string; priceMonthly: number; priceYearly: number }) {
  if (plan.billingInterval === 'year') {
    return Math.round(plan.priceYearly / 12);
  }
  return plan.priceMonthly;
}

export const adminService = {
  getMetrics: async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      organizations,
      subscriptions,
      plans,
      invoices,
      payments,
      trialConversions,
      churned,
    ] = await Promise.all([
      organizationRepository.list(),
      SubscriptionModel.find().lean(),
      PlanModel.find().lean(),
      InvoiceModel.find({ status: 'PAID' }).lean(),
      PaymentModel.find().lean(),
      SubscriptionModel.countDocuments({ status: 'ACTIVE', trialEndsAt: { $ne: null } }),
      SubscriptionModel.countDocuments({ status: 'ARCHIVED', archivedAt: { $gte: since } }),
    ]);

    const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'ACTIVE');
    const mrr = activeSubscriptions.reduce((sum, subscription) => {
      const plan = plans.find((item) => item.code === subscription.planCode);
      if (!plan) {
        return sum;
      }
      return sum + planMonthlyEquivalent(plan);
    }, 0);

    const revenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paymentFailures = payments.filter((payment) => payment.status === 'FAILED');
    const activeOrganizationCount = organizations.filter((organization) => organization.status === 'ACTIVE').length;
    const trialCount = subscriptions.filter((subscription) => subscription.status === 'TRIAL').length;
    const planDistribution = Object.entries(
      subscriptions.reduce<Record<string, number>>((acc, subscription) => {
        acc[subscription.planCode] = (acc[subscription.planCode] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([planCode, count]) => ({ planCode, count }));

    const featureCounts = featureKeys.map((feature) => ({
      feature,
      enabledSubscriptions: activeSubscriptions.filter((subscription) => Boolean(subscription.featureSnapshot?.[feature])).length,
    }));

    return {
      mrr,
      arr: mrr * 12,
      revenue,
      activeOrganizations: activeOrganizationCount,
      trials: trialCount,
      conversions: trialConversions,
      churn: churned,
      planDistribution,
      featureAdoption: featureCounts,
      paymentFailures: paymentFailures.length,
    };
  },
  getRevenueReport: async () => {
    const [paidInvoices, failedPayments, openInvoices] = await Promise.all([
      InvoiceModel.aggregate([{ $match: { status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      PaymentModel.countDocuments({ status: 'FAILED' }),
      InvoiceModel.countDocuments({ status: { $in: ['OPEN', 'PAST_DUE'] } }),
    ]);

    return {
      revenue: paidInvoices[0]?.total ?? 0,
      failedPayments,
      openInvoices,
    };
  },
  getPlanDistribution: async () => {
    const distribution = await SubscriptionModel.aggregate([
      { $group: { _id: '$planCode', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    return distribution.map((entry) => ({
      planCode: entry._id,
      count: entry.count,
    }));
  },
  getPaymentFailures: async () => {
    const failures = await PaymentModel.find({ status: 'FAILED' }).sort({ createdAt: -1 }).limit(50).lean();
    return {
      count: failures.length,
      items: failures,
    };
  },
  getFeatureAdoption: async () => {
    const activeSubscriptions = await SubscriptionModel.find({ status: 'ACTIVE' }).lean();
    return featureKeys.map((feature) => ({
      feature,
      enabledSubscriptions: activeSubscriptions.filter((subscription) => Boolean(subscription.featureSnapshot?.[feature])).length,
    }));
  },
  getOperationalMetrics: async () => metrics.snapshot(),
  replayOutboxEvent: async (eventId: string) => {
    const event = await eventRepository.findOutboxById(eventId);
    if (!event) {
      throw new AppError('Outbox event not found', 404, ErrorCodes.NotFound);
    }

    if (!['FAILED', 'DEAD_LETTER', 'PROCESSING'].includes(event.status)) {
      throw new AppError('Outbox event is not replayable', 409, ErrorCodes.Conflict);
    }

    const replayed = await eventRepository.requeueOutbox(eventId);
    metrics.increment('outbox_replayed_total');
    return replayed;
  },
};

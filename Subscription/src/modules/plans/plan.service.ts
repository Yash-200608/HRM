import { defaultPlans } from './default-plans';
import { planRepository } from './plan.repository';
import { subscriptionRepository } from '../subscriptions/subscription.repository';
import type { FeatureMatrix } from './plan.types';

function buildFeatureSnapshot(features: FeatureMatrix) {
  return { ...features };
}

async function refreshSubscriptionSnapshotsFromPlans() {
  const { SubscriptionModel } = await import('../subscriptions/subscription.model');
  const subscriptions = await SubscriptionModel.find({
    status: { $in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'READ_ONLY'] },
  }).lean();

  for (const subscription of subscriptions) {
    const plan = await planRepository.findByCode(subscription.planCode);
    if (!plan?.features) {
      continue;
    }

    await subscriptionRepository.updateById(String(subscription._id), {
      featureSnapshot: buildFeatureSnapshot(plan.features),
    });
  }
}

export const planService = {
  list: () => planRepository.findVisible(),
  getById: (id: string) => planRepository.findById(id),
  getByCode: (code: string) => planRepository.findByCode(code),
  seedDefaults: async () => {
    for (const plan of defaultPlans) {
      await planRepository.upsertFromDefinition(plan);
    }

    await refreshSubscriptionSnapshotsFromPlans();
  },
};

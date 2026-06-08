import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { featureRepository } from './feature.repository';
import { subscriptionRepository } from '../subscriptions/subscription.repository';

export const featureService = {
  check: async (organizationId: string, feature: string) => {
    const subscription = await subscriptionRepository.findByOrganization(organizationId);
    if (!subscription) {
      throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
    }

    const overrides = await featureRepository.listByOrganization(organizationId);
    const override = overrides.find((item) => item.feature === feature);
    if (override) {
      return { allowed: override.allowed };
    }

    return { allowed: Boolean(subscription.featureSnapshot?.[feature]) };
  },
};

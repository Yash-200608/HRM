import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { featureRepository } from './feature.repository';
import { subscriptionRepository } from '../subscriptions/subscription.repository';
import { planRepository } from '../plans/plan.repository';
import { assertHrmOrganizationExists } from '../organizations/organization-ownership.service';
import type { FeatureMatrix } from '../plans/plan.types';

function resolveCatalogFeature(
  planFeatures: FeatureMatrix | null | undefined,
  feature: string,
) {
  if (!planFeatures || typeof planFeatures !== 'object') {
    return null;
  }

  if (!(feature in planFeatures)) {
    return null;
  }

  return Boolean(planFeatures[feature as keyof FeatureMatrix]);
}

export const featureService = {
  check: async (organizationId: string, feature: string) => {
    await assertHrmOrganizationExists(organizationId);
    const subscription = await subscriptionRepository.findByOrganization(organizationId);
    if (!subscription) {
      throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
    }

    const overrides = await featureRepository.listByOrganization(organizationId);
    const override = overrides.find((item) => item.feature === feature);
    if (override) {
      return { allowed: override.allowed };
    }

    const plan = await planRepository.findByCode(subscription.planCode);
    const catalogAllowed = resolveCatalogFeature(plan?.features, feature);
    if (catalogAllowed != null) {
      return { allowed: catalogAllowed };
    }

    return { allowed: Boolean(subscription.featureSnapshot?.[feature]) };
  },
};

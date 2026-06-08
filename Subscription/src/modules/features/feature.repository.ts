import type { ClientSession } from 'mongoose';
import { FeatureOverrideModel } from './feature-override.model';

type DbOptions = { session?: ClientSession };

export const featureRepository = {
  listByOrganization: (organizationId: string) => FeatureOverrideModel.find({ organization: organizationId }).lean(),
  upsertOverride: (organizationId: string, feature: string, allowed: boolean, reason?: string, options?: DbOptions) =>
    FeatureOverrideModel.findOneAndUpdate(
      { organization: organizationId, feature },
      { $set: { allowed, reason } },
      { upsert: true, new: true, setDefaultsOnInsert: true, session: options?.session },
    ).lean(),
};

import type { ClientSession } from 'mongoose';
import { UsageModel } from './usage.model';

type DbOptions = { session?: ClientSession };

export const usageRepository = {
  getByOrganization: (organizationId: string, options?: DbOptions) => UsageModel.findOne({ organization: organizationId }).session(options?.session ?? null).lean(),
  upsertByOrganization: (organizationId: string, update: Record<string, unknown>, options?: DbOptions) =>
    UsageModel.findOneAndUpdate({ organization: organizationId }, update, { upsert: true, new: true, setDefaultsOnInsert: true, session: options?.session }).lean(),
};

import type { ClientSession } from 'mongoose';
import { PlanModel } from './plan.model';
import type { PlanDefinition } from './plan.types';

type DbOptions = { session?: ClientSession };

export const planRepository = {
  findVisible: (options?: DbOptions) => PlanModel.find({ hidden: false }).session(options?.session ?? null).sort({ code: 1 }).lean(),
  findById: (id: string, options?: DbOptions) => PlanModel.findById(id).session(options?.session ?? null).lean(),
  findByCode: (code: string, options?: DbOptions) => PlanModel.findOne({ code }).session(options?.session ?? null).lean(),
  upsertFromDefinition: async (plan: PlanDefinition, options?: DbOptions) => {
    return PlanModel.findOneAndUpdate(
      { code: plan.code, version: plan.version },
      { $set: plan },
      { upsert: true, new: true, setDefaultsOnInsert: true, session: options?.session },
    ).lean();
  },
  count: (options?: DbOptions) => PlanModel.countDocuments().session(options?.session ?? null),
};

import { defaultPlans } from './default-plans';
import { planRepository } from './plan.repository';

export const planService = {
  list: () => planRepository.findVisible(),
  getById: (id: string) => planRepository.findById(id),
  getByCode: (code: string) => planRepository.findByCode(code),
  seedDefaults: async () => {
    const existingCount = await planRepository.count();
    if (existingCount > 0) {
      return;
    }

    for (const plan of defaultPlans) {
      await planRepository.upsertFromDefinition(plan);
    }
  },
};

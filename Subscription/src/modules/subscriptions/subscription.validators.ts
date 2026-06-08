import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  organizationId: z.string().min(1),
  planCode: z.string().min(1),
});

export const subscriptionIdParamsSchema = z.object({
  id: z.string().min(1),
});

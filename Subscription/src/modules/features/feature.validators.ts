import { z } from 'zod';

export const featureCheckSchema = z.object({
  organizationId: z.string().min(1),
  feature: z.string().min(1),
});

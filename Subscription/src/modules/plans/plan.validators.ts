import { z } from 'zod';

export const planIdParamsSchema = z.object({
  id: z.string().min(1),
});

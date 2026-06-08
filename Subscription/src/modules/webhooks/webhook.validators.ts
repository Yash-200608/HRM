import { z } from 'zod';

export const razorpayWebhookSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  entity: z.record(z.string(), z.unknown()).optional(),
  account_id: z.string().optional(),
});

import { z } from 'zod';

export const employeeLimitCheckSchema = z.object({
  organizationId: z.string().min(1),
  requestedEmployees: z.number().int().min(0),
});

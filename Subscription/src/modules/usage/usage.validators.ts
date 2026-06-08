import { z } from 'zod';

export const usageSyncSchema = z.object({
  organizationId: z.string().min(1),
  activeEmployees: z.number().int().min(0),
  archivedEmployees: z.number().int().min(0).optional(),
  eventId: z.string().min(1).optional(),
});

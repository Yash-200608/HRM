import { z } from 'zod';

export const archiveUpdateSchema = z.object({
  organizationId: z.string().min(1),
  archiveStatus: z.enum(['NONE', 'ELIGIBLE', 'SCHEDULED', 'ARCHIVED', 'PURGE_SCHEDULED', 'PURGED']).optional(),
  retentionDays: z.number().int().min(0).optional(),
  purgeScheduledAt: z.coerce.date().optional(),
  archiveRequestedAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

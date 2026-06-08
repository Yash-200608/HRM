import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED', 'PURGED']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

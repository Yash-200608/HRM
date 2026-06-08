import { z } from 'zod';

const baseCreateSchema = z.object({
  name: z.string().min(2).max(120),
  scopes: z.array(z.string().min(1)).optional(),
});

export const createAdminApiKeySchema = baseCreateSchema;
export const createOrganizationApiKeySchema = baseCreateSchema;

export const revokeApiKeyParamsSchema = z.object({
  id: z.string().min(1),
});

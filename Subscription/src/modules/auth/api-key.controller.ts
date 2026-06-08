import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { createAdminApiKeySchema, createOrganizationApiKeySchema, revokeApiKeyParamsSchema } from './api-key.validators';
import { apiKeyService } from './api-key.service';

export const apiKeyController = {
  listAdminKeys: async (req: Request, res: Response) => {
    const ownerId = String(req.auth?.subject ?? 'admin');
    const keys = await apiKeyService.listKeys('ADMIN', ownerId);
    res.json({ data: keys });
  },
  createAdminKey: async (req: Request, res: Response) => {
    const input = parseOrThrow(createAdminApiKeySchema, req.body);
    const result = await apiKeyService.createKey({
      ownerType: 'ADMIN',
      ownerId: String(req.auth?.subject ?? 'admin'),
      name: input.name,
      scopes: input.scopes,
    });
    res.status(201).json({
      data: result.record,
      secret: result.apiKey,
    });
  },
  revokeAdminKey: async (req: Request, res: Response) => {
    const input = parseOrThrow(revokeApiKeyParamsSchema, req.params);
    const key = await apiKeyService.revokeKey(input.id);
    res.json({ data: key });
  },
  listOrganizationKeys: async (req: Request, res: Response) => {
    const organizationId = String(req.params.organizationId);
    const keys = await apiKeyService.listKeys('ORGANIZATION', organizationId);
    res.json({ data: keys });
  },
  createOrganizationKey: async (req: Request, res: Response) => {
    const organizationId = String(req.params.organizationId);
    const input = parseOrThrow(createOrganizationApiKeySchema, req.body);
    const result = await apiKeyService.createKey({
      ownerType: 'ORGANIZATION',
      ownerId: organizationId,
      name: input.name,
      scopes: input.scopes,
    });
    res.status(201).json({
      data: result.record,
      secret: result.apiKey,
    });
  },
  revokeOrganizationKey: async (req: Request, res: Response) => {
    const input = parseOrThrow(revokeApiKeyParamsSchema, req.params);
    const key = await apiKeyService.revokeKey(input.id);
    res.json({ data: key });
  },
};

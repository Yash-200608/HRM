import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { createOrganizationSchema, updateOrganizationSchema } from './organization.validators';
import { organizationService } from './organization.service';

export const organizationController = {
  create: async (req: Request, res: Response) => {
    const input = parseOrThrow(createOrganizationSchema, req.body);
    const organization = await organizationService.create(input, { idempotencyKey: req.idempotencyKey });
    res.status(201).json({ data: organization });
  },
  getById: async (req: Request, res: Response) => {
    const organization = await organizationService.getById(String(req.params.id));
    res.json({ data: organization });
  },
  patch: async (req: Request, res: Response) => {
    const input = parseOrThrow(updateOrganizationSchema, req.body);
    const organization = await organizationService.update(String(req.params.id), input);
    res.json({ data: organization });
  },
};

import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { usageSyncSchema } from './usage.validators';
import { usageService } from './usage.service';

export const usageController = {
  sync: async (req: Request, res: Response) => {
    const input = parseOrThrow(usageSyncSchema, req.body);
    const usage = await usageService.sync(input);
    res.json({ data: usage });
  },
  getByOrganization: async (req: Request, res: Response) => {
    const usage = await usageService.getByOrganization(String(req.params.organizationId));
    res.json({ data: usage });
  },
  checkEmployeeLimit: async (req: Request, res: Response) => {
    const result = await usageService.checkEmployeeLimit(String(req.body.organizationId), Number(req.body.requestedEmployees));
    res.json(result);
  },
};

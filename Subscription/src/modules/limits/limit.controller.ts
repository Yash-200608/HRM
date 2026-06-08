import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { employeeLimitCheckSchema } from './limit.validators';
import { usageService } from '../usage/usage.service';

export const limitController = {
  checkEmployeeLimit: async (req: Request, res: Response) => {
    const input = parseOrThrow(employeeLimitCheckSchema, req.body);
    const result = await usageService.checkEmployeeLimit(input.organizationId, input.requestedEmployees);
    res.json(result);
  },
};

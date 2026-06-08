import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { featureCheckSchema } from './feature.validators';
import { featureService } from './feature.service';

export const featureController = {
  check: async (req: Request, res: Response) => {
    const input = parseOrThrow(featureCheckSchema, req.body);
    const result = await featureService.check(input.organizationId, input.feature);
    res.json(result);
  },
};

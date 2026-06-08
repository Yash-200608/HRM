import type { Request, Response } from 'express';
import { planService } from './plan.service';

export const planController = {
  list: async (_req: Request, res: Response) => {
    const plans = await planService.list();
    res.json({ data: plans });
  },
  getById: async (req: Request, res: Response) => {
    const plan = await planService.getById(String(req.params.id));
    res.json({ data: plan });
  },
};

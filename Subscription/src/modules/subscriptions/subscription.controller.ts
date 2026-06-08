import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { createSubscriptionSchema } from './subscription.validators';
import { subscriptionService } from './subscription.service';

export const subscriptionController = {
  create: async (req: Request, res: Response) => {
    const input = parseOrThrow(createSubscriptionSchema, req.body);
    const subscription = await subscriptionService.create(input, { idempotencyKey: req.idempotencyKey });
    res.status(201).json({ data: subscription });
  },
  upgrade: async (req: Request, res: Response) => {
    const subscription = await subscriptionService.upgrade(String(req.params.id), String(req.body.planCode), { idempotencyKey: req.idempotencyKey });
    res.json({ data: subscription });
  },
  downgrade: async (req: Request, res: Response) => {
    const subscription = await subscriptionService.downgrade(String(req.params.id), String(req.body.planCode), { idempotencyKey: req.idempotencyKey });
    res.json({ data: subscription });
  },
  cancel: async (req: Request, res: Response) => {
    const subscription = await subscriptionService.cancel(String(req.params.id), { idempotencyKey: req.idempotencyKey });
    res.json({ data: subscription });
  },
  getById: async (req: Request, res: Response) => {
    const subscription = await subscriptionService.getById(String(req.params.id));
    res.json({ data: subscription });
  },
};

import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { razorpayWebhookSchema } from './webhook.validators';
import { webhookService } from './webhook.service';

export const webhookController = {
  razorpay: async (req: Request, res: Response) => {
    const payload = parseOrThrow(razorpayWebhookSchema, req.body);
    const result = await webhookService.processRazorpayWebhook({
      eventId: String(req.header('x-event-id') ?? req.body?.event_id ?? `evt_${Date.now()}`),
      eventType: payload.event,
      payload: req.body,
      rawBody: req.rawBody,
      signature: req.header('x-razorpay-signature') ?? undefined,
    });
    res.json({ data: result.record, deduped: result.deduped });
  },
};

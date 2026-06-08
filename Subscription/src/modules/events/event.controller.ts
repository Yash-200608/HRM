import type { Request, Response } from 'express';
import { eventRepository } from './event.repository';
import { parseOrThrow } from '../../common/validation';
import { z } from 'zod';

const inboundEventSchema = z.object({
  eventId: z.string().min(1),
  source: z.string().min(1),
  topic: z.string().min(1),
  organizationId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const eventController = {
  ingest: async (req: Request, res: Response) => {
    const input = parseOrThrow(inboundEventSchema, req.body);
    const existing = await eventRepository.findInboxByOrganizationEventId(input.organizationId, input.eventId);
    if (existing) {
      res.status(200).json({ data: existing, deduped: true });
      return;
    }

    const record = await eventRepository.createInbox({
      eventId: input.eventId,
      source: input.source,
      topic: input.topic,
      organizationId: input.organizationId,
      payload: input.payload,
      status: 'RECEIVED',
    });
    res.status(201).json({ data: record });
  },
};

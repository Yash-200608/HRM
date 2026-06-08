import type { Request, Response } from 'express';
import { parseOrThrow } from '../../common/validation';
import { archiveUpdateSchema } from './archive.validators';
import { archiveService } from './archive.service';

export const archiveController = {
  getByOrganization: async (req: Request, res: Response) => {
    const metadata = await archiveService.getByOrganization(String(req.params.organizationId));
    res.json({ data: metadata });
  },
  update: async (req: Request, res: Response) => {
    const input = parseOrThrow(archiveUpdateSchema, req.body);
    const metadata = await archiveService.update(input.organizationId, input);
    res.json({ data: metadata });
  },
  restore: async (req: Request, res: Response) => {
    const metadata = await archiveService.restore(String(req.params.organizationId));
    res.json({ data: metadata });
  },
};

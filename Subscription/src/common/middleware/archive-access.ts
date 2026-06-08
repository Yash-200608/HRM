import type { NextFunction, Request, Response } from 'express';
import { archiveService } from '../../modules/archive/archive.service';

export function requireWritableTenantOrganizationFromParam(paramName = 'organizationId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const organizationId = String(req.params[paramName] ?? '');
      await archiveService.assertOrganizationWritable(organizationId);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireWritableTenantOrganizationFromBody(bodyKey = 'organizationId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const organizationId = String(req.body?.[bodyKey] ?? '');
      await archiveService.assertOrganizationWritable(organizationId);
      next();
    } catch (error) {
      next(error);
    }
  };
}

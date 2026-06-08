import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import { assertTenantOrganizationAccess, resolveTenantBodyOrganizationId } from '../security/tenant';

export function requireTenantParamOrganization(paramName = 'organizationId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const targetOrganizationId = String(req.params[paramName] ?? '');
    try {
      assertTenantOrganizationAccess(req.auth, targetOrganizationId);
      req.tenant = { organizationId: targetOrganizationId };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireTenantBodyOrganization(bodyKey = 'organizationId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const bodyOrganizationId = typeof req.body?.[bodyKey] === 'string' ? String(req.body[bodyKey]) : undefined;
    try {
      const resolvedOrganizationId = resolveTenantBodyOrganizationId(req.auth, bodyOrganizationId);
      if (req.auth?.kind === 'organization' && resolvedOrganizationId) {
        req.body[bodyKey] = resolvedOrganizationId;
      }
      req.tenant = { organizationId: resolvedOrganizationId };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireResourceOrganizationAccess(resolveOrganizationId: (req: Request) => Promise<string | null> | string | null) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const targetOrganizationId = await resolveOrganizationId(req);
      if (!targetOrganizationId) {
        throw new AppError('Resource not found', 404, ErrorCodes.NotFound);
      }

      assertTenantOrganizationAccess(req.auth, targetOrganizationId);
      req.tenant = { organizationId: targetOrganizationId };
      next();
    } catch (error) {
      next(error);
    }
  };
}

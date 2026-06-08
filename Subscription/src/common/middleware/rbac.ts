import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import { hasRole } from '../../modules/auth/rbac.service';

export function requireRoles(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (hasRole(req.auth, roles)) {
      next();
      return;
    }

    next(new AppError('Forbidden', 403, ErrorCodes.Forbidden));
  };
}

export function requireOrganizationAccess() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth?.kind === 'service' || req.auth?.kind === 'admin') {
      next();
      return;
    }

    const routeOrganizationId = String(req.params.organizationId ?? req.params.id ?? '');
    if (req.auth?.kind === 'organization' && req.auth.organizationId === routeOrganizationId) {
      next();
      return;
    }

    next(new AppError('Forbidden', 403, ErrorCodes.Forbidden));
  };
}

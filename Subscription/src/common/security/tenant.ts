import { AppError } from '../errors/app-error';
import { ErrorCodes } from '../errors/error-codes';
import type { AuthPrincipal } from '../types/auth';

export function getTenantOrganizationId(principal: AuthPrincipal | undefined) {
  if (!principal) {
    return null;
  }

  return principal.kind === 'organization' ? principal.organizationId ?? null : null;
}

export function assertTenantOrganizationAccess(principal: AuthPrincipal | undefined, targetOrganizationId: string | null | undefined) {
  if (!principal) {
    throw new AppError('Unauthorized', 401, ErrorCodes.Unauthorized);
  }

  if (principal.kind === 'admin' || principal.kind === 'service') {
    return;
  }

  if (principal.kind !== 'organization' || !principal.organizationId || !targetOrganizationId) {
    throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
  }

  if (principal.organizationId !== targetOrganizationId) {
    throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
  }
}

export function resolveTenantBodyOrganizationId(principal: AuthPrincipal | undefined, bodyOrganizationId: string | undefined) {
  if (!principal) {
    throw new AppError('Unauthorized', 401, ErrorCodes.Unauthorized);
  }

  if (principal.kind === 'admin' || principal.kind === 'service') {
    return bodyOrganizationId ?? null;
  }

  const authenticatedOrganizationId = principal.kind === 'organization' ? principal.organizationId ?? null : null;
  if (!authenticatedOrganizationId) {
    throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
  }

  if (bodyOrganizationId && bodyOrganizationId !== authenticatedOrganizationId) {
    throw new AppError('Forbidden', 403, ErrorCodes.Forbidden);
  }

  return authenticatedOrganizationId;
}

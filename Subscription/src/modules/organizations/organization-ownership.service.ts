import type { ClientSession } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { organizationRepository } from './organization.repository';

type DbOptions = { session?: ClientSession };

export async function assertHrmOrganizationExists(organizationId: string, options?: DbOptions) {
  const organization = await organizationRepository.findById(organizationId, options);
  if (!organization) {
    throw new AppError('HRM organization not found', 404, ErrorCodes.NotFound);
  }

  return organization;
}

export function assertSameHrmOrganization(expectedOrganizationId: string, actualOrganizationId: string) {
  if (expectedOrganizationId !== actualOrganizationId) {
    throw new AppError('Billing resource belongs to a different HRM organization', 403, ErrorCodes.Forbidden);
  }
}

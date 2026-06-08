import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { assertHrmOrganizationExists } from '../organizations/organization-ownership.service';
import { subscriptionRepository } from '../subscriptions/subscription.repository';
import { usageRepository } from './usage.repository';
import { archiveService } from '../archive/archive.service';

export const usageService = {
  sync: async (input: { organizationId: string; activeEmployees: number; archivedEmployees?: number }) => {
    await assertHrmOrganizationExists(input.organizationId);
    await archiveService.assertOrganizationWritable(input.organizationId);

    const subscription = await subscriptionRepository.findByOrganization(input.organizationId);
    const activeEmployees = input.activeEmployees;
    const archivedEmployees = input.archivedEmployees ?? 0;
    const overageEmployees =
      subscription?.employeeLimit != null ? Math.max(0, activeEmployees - subscription.employeeLimit) : 0;

    return usageRepository.upsertByOrganization(input.organizationId, {
      activeEmployees,
      archivedEmployees,
      overageEmployees,
      lastSyncedAt: new Date(),
    });
  },
  getByOrganization: async (organizationId: string) => {
    await assertHrmOrganizationExists(organizationId);
    return usageRepository.getByOrganization(organizationId);
  },
  checkEmployeeLimit: async (organizationId: string, requestedEmployees: number) => {
    await assertHrmOrganizationExists(organizationId);
    const subscription = await subscriptionRepository.findByOrganization(organizationId);
    if (!subscription) {
      throw new AppError('Subscription not found', 404, ErrorCodes.NotFound);
    }
    await archiveService.assertOrganizationWritable(organizationId);

    if (subscription.employeeLimit == null) {
      return { allowed: true, reason: null };
    }

    const allowed = requestedEmployees <= subscription.employeeLimit;
    return {
      allowed,
      reason: allowed ? null : ErrorCodes.EmployeeLimitExceeded,
      limit: subscription.employeeLimit,
      current: requestedEmployees,
    };
  },
};

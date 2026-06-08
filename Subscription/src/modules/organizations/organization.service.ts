import { createPublicId } from '../../common/security/id';
import { organizationRepository } from './organization.repository';
import type { OrganizationStatus } from './organization.types';
import { runIdempotentOperation } from '../idempotency/idempotency.service';
import { archiveService } from '../archive/archive.service';

export const organizationService = {
  create: async (input: { name: string; slug: string; metadata?: Record<string, unknown> }, options?: { idempotencyKey?: string }) => {
    const work = async () =>
      organizationRepository.create({
        publicId: createPublicId('org'),
        name: input.name,
        slug: input.slug,
        metadata: input.metadata ?? {},
        status: 'ACTIVE' satisfies OrganizationStatus,
        planCode: 'free',
      });

    if (options?.idempotencyKey) {
      return runIdempotentOperation({
        scope: 'organization:create',
        key: options.idempotencyKey,
        payload: input,
        operation: work,
      });
    }

    return work();
  },
  getById: (id: string) => organizationRepository.findById(id),
  update: async (id: string, update: Record<string, unknown>) => {
    await archiveService.assertOrganizationWritable(id);
    return organizationRepository.updateById(id, update);
  },
};

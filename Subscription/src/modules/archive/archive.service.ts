import { AppError } from '../../common/errors/app-error';
import { ErrorCodes } from '../../common/errors/error-codes';
import { eventRepository } from '../events/event.repository';
import { archiveRepository } from './archive.repository';
import { metrics } from '../../common/observability/metrics';

const ARCHIVE_READ_ONLY_STATES = new Set(['ARCHIVED', 'PURGE_SCHEDULED', 'PURGED']);

function retentionDate(retentionDays: number) {
  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
}

export const archiveService = {
  getByOrganization: (organizationId: string) => archiveRepository.findByOrganization(organizationId),
  assertOrganizationWritable: async (organizationId: string) => {
    const metadata = await archiveRepository.findByOrganization(organizationId);
    if (metadata && ARCHIVE_READ_ONLY_STATES.has(metadata.archiveStatus)) {
      throw new AppError('Subscription read-only', 403, ErrorCodes.SubscriptionReadOnly);
    }
    return metadata;
  },
  update: async (organizationId: string, update: Record<string, unknown>) => {
    const metadata = await archiveRepository.findByOrganization(organizationId);
    const nextStatus = typeof update.archiveStatus === 'string' ? update.archiveStatus : metadata?.archiveStatus ?? 'NONE';
    const now = new Date();
    const retentionDays = typeof update.retentionDays === 'number' ? update.retentionDays : metadata?.retentionDays ?? 365;

    if (metadata && ARCHIVE_READ_ONLY_STATES.has(metadata.archiveStatus) && nextStatus !== 'NONE') {
      throw new AppError('Subscription read-only', 403, ErrorCodes.SubscriptionReadOnly);
    }

    if (nextStatus === 'ARCHIVED') {
      const archived = await archiveRepository.upsertByOrganization(organizationId, {
        archiveStatus: 'ARCHIVED',
        archiveRequestedAt: metadata?.archiveRequestedAt ?? now,
        archivedAt: metadata?.archivedAt ?? now,
        purgeScheduledAt: metadata?.purgeScheduledAt ?? retentionDate(retentionDays),
        purgedAt: null,
        restoredAt: null,
        retentionDays,
        lastEvaluatedAt: now,
        metadata: update.metadata ?? metadata?.metadata ?? {},
      });

      await eventRepository.createOutbox({
        eventId: `organization.archived.${organizationId}.${Date.now()}`,
        topic: 'organization.archived',
        aggregateType: 'Organization',
        aggregateId: organizationId,
        organization: organizationId,
        payload: {
          organizationId,
          archiveStatus: 'ARCHIVED',
          archivedAt: archived?.archivedAt ?? now,
          purgeScheduledAt: archived?.purgeScheduledAt ?? retentionDate(retentionDays),
        },
        headers: {},
        status: 'PENDING',
        attempts: 0,
        availableAt: null,
      });

      metrics.increment('archive_archived_total');

      return archived;
    }

    if (nextStatus === 'PURGE_SCHEDULED') {
      const scheduled = await archiveRepository.upsertByOrganization(organizationId, {
        archiveStatus: 'PURGE_SCHEDULED',
        purgeScheduledAt: update.purgeScheduledAt instanceof Date ? update.purgeScheduledAt : retentionDate(retentionDays),
        retentionDays,
        lastEvaluatedAt: now,
        metadata: update.metadata ?? metadata?.metadata ?? {},
      });
      metrics.increment('archive_purge_scheduled_total');
      return scheduled;
    }

    if (nextStatus === 'PURGED') {
      const purged = await archiveRepository.upsertByOrganization(organizationId, {
        archiveStatus: 'PURGED',
        purgedAt: now,
        restoredAt: null,
        lastEvaluatedAt: now,
        metadata: update.metadata ?? metadata?.metadata ?? {},
      });
      metrics.increment('archive_purged_total');
      return purged;
    }

    if (nextStatus === 'ELIGIBLE' || nextStatus === 'SCHEDULED' || nextStatus === 'NONE') {
      return archiveRepository.upsertByOrganization(organizationId, {
        archiveStatus: nextStatus,
        retentionDays,
        archiveRequestedAt: update.archiveRequestedAt instanceof Date ? update.archiveRequestedAt : metadata?.archiveRequestedAt ?? null,
        lastEvaluatedAt: now,
        metadata: update.metadata ?? metadata?.metadata ?? {},
      });
    }

    return archiveRepository.upsertByOrganization(organizationId, {
      ...update,
      lastEvaluatedAt: now,
    });
  },
  restore: async (organizationId: string) => {
    const metadata = await archiveRepository.findByOrganization(organizationId);
    if (metadata?.archiveStatus === 'PURGED') {
      throw new AppError('Archived organization has been purged', 409, ErrorCodes.Conflict);
    }

    const restored = await archiveRepository.upsertByOrganization(organizationId, {
      archiveStatus: 'NONE',
      archivedAt: null,
      archiveRequestedAt: null,
      purgeScheduledAt: null,
      purgedAt: null,
      restoredAt: new Date(),
      lastEvaluatedAt: new Date(),
    });
    metrics.increment('archive_restored_total');
    return restored;
  },
  purgeDue: async () => {
    const due = await archiveRepository.findDueForPurge();
    const now = new Date();

    const purged = await Promise.all(
      due.map((record) =>
        archiveRepository.upsertByOrganization(String(record.organization), {
          archiveStatus: 'PURGED',
          purgedAt: now,
          restoredAt: null,
          lastEvaluatedAt: now,
          metadata: record.metadata ?? {},
          retentionDays: record.retentionDays,
        }),
      ),
    );

    metrics.gauge('archive_purge_due_total', undefined, due.length);

    return { processed: due.length, purged };
  },
};

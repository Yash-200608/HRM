import type { ClientSession } from 'mongoose';
import { ArchiveMetadataModel } from './archive-metadata.model';

type DbOptions = { session?: ClientSession };

export const archiveRepository = {
  upsertByOrganization: (organizationId: string, update: Record<string, unknown>, options?: DbOptions) =>
    ArchiveMetadataModel.findOneAndUpdate({ organization: organizationId }, update, { upsert: true, new: true, setDefaultsOnInsert: true, session: options?.session }).lean(),
  findByOrganization: (organizationId: string) => ArchiveMetadataModel.findOne({ organization: organizationId }).lean(),
  findDueForPurge: (now = new Date()) =>
    ArchiveMetadataModel.find({
      archiveStatus: { $in: ['ARCHIVED', 'PURGE_SCHEDULED'] },
      purgeScheduledAt: { $ne: null, $lte: now },
    }).lean(),
};

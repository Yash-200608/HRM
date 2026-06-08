import { Schema, model } from 'mongoose';

const archiveMetadataSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },
    archiveStatus: { type: String, required: true, enum: ['NONE', 'ELIGIBLE', 'SCHEDULED', 'ARCHIVED', 'PURGE_SCHEDULED', 'PURGED'], default: 'NONE', index: true },
    eligibleAt: { type: Date, default: null },
    archiveRequestedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    purgeScheduledAt: { type: Date, default: null },
    purgedAt: { type: Date, default: null },
    restoredAt: { type: Date, default: null },
    retentionDays: { type: Number, required: true, default: 365, min: 0 },
    lastEvaluatedAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

archiveMetadataSchema.index({ archiveStatus: 1, purgeScheduledAt: 1 });

export const ArchiveMetadataModel = model('ArchiveMetadata', archiveMetadataSchema);

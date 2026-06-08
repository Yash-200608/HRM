import { Schema, model } from 'mongoose';

const organizationSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    status: { type: String, required: true, enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED', 'PURGED'], default: 'ACTIVE', index: true },
    planCode: { type: String, required: false, default: 'free', index: true },
    metadata: { type: Schema.Types.Mixed, required: false, default: {} },
    archivedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const OrganizationModel = model('Organization', organizationSchema);

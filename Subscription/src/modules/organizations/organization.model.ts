import { Schema, model } from 'mongoose';

const organizationSchema = new Schema(
  {
    publicId: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    slug: { type: String, default: null, lowercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    contactNumber: { type: String, required: true },
    website: { type: String, default: null },
    logo: { type: String, default: '' },
    address: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'SuperAdmin', required: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'Admin' }],
    isActive: { type: Boolean, default: true, index: true },
    totalLeave: { type: Number, default: 0 },
    specialLeave: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED', 'PURGED'], default: 'ACTIVE', index: true },
    planCode: { type: String, required: false, default: 'free', index: true },
    metadata: { type: Schema.Types.Mixed, required: false, default: {} },
    archivedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

organizationSchema.index({ publicId: 1 }, { unique: true, partialFilterExpression: { publicId: { $type: 'string' } } });
organizationSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } });
organizationSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

// Billing keeps the Organization model name for existing refs, but stores tenants in HRM's companies collection.
export const OrganizationModel = model('Organization', organizationSchema, 'companies');

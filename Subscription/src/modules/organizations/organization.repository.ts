import { Types, type ClientSession } from 'mongoose';
import { OrganizationModel } from './organization.model';

type DbOptions = { session?: ClientSession };
type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'PURGED';

const SUBSCRIPTION_COMPAT_SUPER_ADMIN_ID = new Types.ObjectId('000000000000000000000000');
const DEFAULT_CONTACT_NUMBER = '0000000000';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isObjectIdString(value: unknown): value is string {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

function normalizeSlug(value: unknown, fallback: string) {
  const raw = typeof value === 'string' && value.trim() ? value : fallback;
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'organization';
}

function buildCompatibilityEmail(slug: string) {
  return `${slug}@subscription.local.invalid`;
}

function toStatus(doc: Record<string, unknown>): OrganizationStatus {
  if (doc.status === 'SUSPENDED' || doc.status === 'ARCHIVED' || doc.status === 'PURGED') {
    return doc.status;
  }
  return doc.isActive === false ? 'SUSPENDED' : 'ACTIVE';
}

function normalizeOrganization<T>(doc: T): T {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  const record = doc as Record<string, unknown>;
  record.status = toStatus(record);
  record.metadata = asRecord(record.metadata);
  return doc;
}

function normalizeOrganizations<T>(docs: T[]): T[] {
  return docs.map((doc) => normalizeOrganization(doc));
}

function toCreatePayload(payload: Record<string, unknown>) {
  const metadata = asRecord(payload.metadata);
  const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : 'Organization';
  const slug = normalizeSlug(payload.slug, name);
  const status = toStatus({ status: payload.status, isActive: payload.isActive });
  const createdBy = isObjectIdString(metadata.createdBy) ? new Types.ObjectId(metadata.createdBy) : SUBSCRIPTION_COMPAT_SUPER_ADMIN_ID;

  return {
    ...payload,
    name,
    slug,
    status,
    isActive: status === 'ACTIVE',
    email: typeof metadata.email === 'string' && metadata.email.trim() ? metadata.email.trim().toLowerCase() : buildCompatibilityEmail(slug),
    contactNumber: typeof metadata.contactNumber === 'string' && metadata.contactNumber.trim() ? metadata.contactNumber.trim() : DEFAULT_CONTACT_NUMBER,
    createdBy,
    admins: Array.isArray(payload.admins) ? payload.admins : [],
    metadata: {
      ...metadata,
      tenantSource: 'hrm_company',
      createdVia: metadata.createdVia ?? 'subscription_compatibility',
    },
  };
}

function toUpdatePayload(update: Record<string, unknown>) {
  const next = { ...update };

  if (typeof next.name === 'string') {
    next.name = next.name.trim();
  }

  if (typeof next.slug === 'string') {
    next.slug = normalizeSlug(next.slug, String(next.name ?? next.slug));
  }

  if (next.status === 'ACTIVE') {
    next.isActive = true;
  }

  if (next.status === 'SUSPENDED' || next.status === 'ARCHIVED' || next.status === 'PURGED') {
    next.isActive = false;
  }

  return next;
}

export const organizationRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    OrganizationModel.create([toCreatePayload(payload)], options ? { session: options.session } : undefined).then((docs) => normalizeOrganization(docs[0])),
  findById: async (id: string, options?: DbOptions) => normalizeOrganization(await OrganizationModel.findById(id).session(options?.session ?? null).lean()),
  findByPublicId: async (publicId: string, options?: DbOptions) => normalizeOrganization(await OrganizationModel.findOne({ publicId }).session(options?.session ?? null).lean()),
  list: async (options?: DbOptions) => normalizeOrganizations(await OrganizationModel.find().session(options?.session ?? null).lean()),
  updateById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    OrganizationModel.findByIdAndUpdate(id, toUpdatePayload(update), { new: true, session: options?.session }).lean().then((doc) => normalizeOrganization(doc)),
};

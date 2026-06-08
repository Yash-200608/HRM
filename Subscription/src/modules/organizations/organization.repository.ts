import type { ClientSession } from 'mongoose';
import { OrganizationModel } from './organization.model';

type DbOptions = { session?: ClientSession };

export const organizationRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    OrganizationModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findById: (id: string, options?: DbOptions) => OrganizationModel.findById(id).session(options?.session ?? null).lean(),
  findByPublicId: (publicId: string, options?: DbOptions) => OrganizationModel.findOne({ publicId }).session(options?.session ?? null).lean(),
  updateById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    OrganizationModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
};

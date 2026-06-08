import type { ClientSession } from 'mongoose';
import { OperatorModel } from './operator.model';

type DbOptions = { session?: ClientSession };

export const operatorRepository = {
  create: (payload: Record<string, unknown>, options?: DbOptions) =>
    OperatorModel.create([payload], options ? { session: options.session } : undefined).then((docs) => docs[0]),
  findByEmail: (email: string) => OperatorModel.findOne({ email: email.toLowerCase() }).lean(),
  findByEmailVerificationTokenId: (tokenId: string) => OperatorModel.findOne({ emailVerificationTokenId: tokenId }).lean(),
  findByPasswordResetTokenId: (tokenId: string) => OperatorModel.findOne({ passwordResetTokenId: tokenId }).lean(),
  findById: (id: string) => OperatorModel.findById(id).lean(),
  listByRole: (role: 'ADMIN' | 'USER') => OperatorModel.find({ role }).sort({ createdAt: -1 }).lean(),
  updateById: (id: string, update: Record<string, unknown>, options?: DbOptions) =>
    OperatorModel.findByIdAndUpdate(id, update, { new: true, session: options?.session }).lean(),
};

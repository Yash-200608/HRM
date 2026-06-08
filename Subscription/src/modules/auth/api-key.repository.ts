import { ApiKeyModel } from './api-key.model';

export const apiKeyRepository = {
  create: (payload: Record<string, unknown>) => ApiKeyModel.create(payload),
  findByPrefix: (prefix: string) => ApiKeyModel.findOne({ prefix, revokedAt: null }).lean(),
  findByOwner: (ownerType: string, ownerId: string) => ApiKeyModel.find({ ownerType, ownerId }).sort({ createdAt: -1 }).lean(),
  findById: (id: string) => ApiKeyModel.findById(id).lean(),
  markUsed: (id: string) => ApiKeyModel.findByIdAndUpdate(id, { lastUsedAt: new Date() }, { new: true }).lean(),
  revokeById: (id: string) => ApiKeyModel.findByIdAndUpdate(id, { revokedAt: new Date() }, { new: true }).lean(),
};

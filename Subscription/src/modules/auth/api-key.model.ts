import { Schema, model } from 'mongoose';

const apiKeySchema = new Schema(
  {
    ownerType: { type: String, required: true, enum: ['ORGANIZATION', 'ADMIN', 'WORKER', 'WEBHOOK'], index: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    prefix: { type: String, required: true, index: true },
    keyHash: { type: String, required: true },
    scopes: { type: [String], default: [] },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

apiKeySchema.index({ prefix: 1, revokedAt: 1 });

export const ApiKeyModel = model('ApiKey', apiKeySchema);

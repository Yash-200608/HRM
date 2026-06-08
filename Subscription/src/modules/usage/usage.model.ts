import { Schema, model } from 'mongoose';

const usageSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },
    activeEmployees: { type: Number, required: true, default: 0, min: 0 },
    archivedEmployees: { type: Number, required: true, default: 0, min: 0 },
    overageEmployees: { type: Number, required: true, default: 0, min: 0 },
    sourceVersion: { type: Number, required: true, default: 1 },
    lastSyncedAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

export const UsageModel = model('Usage', usageSchema);

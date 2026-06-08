import { Schema, model } from 'mongoose';

const featureOverrideSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    feature: { type: String, required: true, index: true, trim: true },
    allowed: { type: Boolean, required: true },
    reason: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    source: { type: String, default: 'manual' },
  },
  { timestamps: true, versionKey: false },
);

featureOverrideSchema.index({ organization: 1, feature: 1 }, { unique: true });

export const FeatureOverrideModel = model('FeatureOverride', featureOverrideSchema);

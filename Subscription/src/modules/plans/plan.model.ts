import { Schema, model, type InferSchemaType } from 'mongoose';

const planSchema = new Schema(
  {
    code: { type: String, required: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    version: { type: Number, required: true, default: 1 },
    hidden: { type: Boolean, required: true, default: false },
    purchasable: { type: Boolean, required: true, default: true },
    systemManaged: { type: Boolean, required: true, default: false },
    employeeLimit: { type: Number, default: null },
    billingInterval: { type: String, enum: ['month', 'year'], required: true },
    priceMonthly: { type: Number, required: true, min: 0 },
    priceYearly: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true },
    features: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false },
);

planSchema.index({ code: 1, version: -1 }, { unique: true });

export type PlanDocument = InferSchemaType<typeof planSchema>;
export const PlanModel = model('Plan', planSchema);

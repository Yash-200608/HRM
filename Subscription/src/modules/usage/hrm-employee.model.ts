import { Schema, model } from 'mongoose';

const hrmEmployeeSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    state: { type: String, required: true, enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], default: 'ACTIVE', index: true },
    eventVersion: { type: Number, required: true, default: 0, min: 0 },
    lastEventId: { type: String, required: true, index: true },
    lastEventType: { type: String, required: true, index: true },
    lastProcessedAt: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

hrmEmployeeSchema.index({ organizationId: 1, entityId: 1 }, { unique: true });
hrmEmployeeSchema.index({ organizationId: 1, state: 1 });

export const HrmEmployeeModel = model('HrmEmployee', hrmEmployeeSchema);

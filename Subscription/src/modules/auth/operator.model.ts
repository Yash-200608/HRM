import { Schema, model } from 'mongoose';

const operatorSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['ADMIN', 'USER'], index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    status: { type: String, required: true, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
    emailVerifiedAt: { type: Date, default: null, index: true },
    emailVerificationTokenId: { type: String, default: null },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationTokenExpiresAt: { type: Date, default: null, index: true },
    passwordResetTokenId: { type: String, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetTokenExpiresAt: { type: Date, default: null, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

operatorSchema.index({ email: 1, role: 1 }, { unique: true });
operatorSchema.index(
  { emailVerificationTokenId: 1 },
  { unique: true, partialFilterExpression: { emailVerificationTokenId: { $type: 'string' } } },
);
operatorSchema.index(
  { passwordResetTokenId: 1 },
  { unique: true, partialFilterExpression: { passwordResetTokenId: { $type: 'string' } } },
);

export const OperatorModel = model('Operator', operatorSchema);
